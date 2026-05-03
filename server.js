const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  });
}

loadDotEnv();

const port = Number(process.env.PORT || 4173);

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function requestGeminiModel(model, apiKey, body) {
  const options = {
    hostname: "generativelanguage.googleapis.com",
    path: `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${model}: ${parsed.error?.message || responseBody || `HTTP ${res.statusCode}`}`));
            return;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
          resolve(text || "Healyo could not generate a response right now.");
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function callGemini(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing GEMINI_API_KEY"));
  }

  const context = JSON.stringify(payload.context || {}, null, 2);
  const prompt = [
    "You are Healyo, a warm non-clinical wellness companion for a hackathon project.",
    "Support physical, mental, and emotional wellbeing with concise, practical guidance.",
    "Do not diagnose, prescribe, or replace professional care.",
    "If the user mentions immediate danger, severe symptoms, self-harm, or crisis, advise contacting local emergency services or a trusted person now.",
    `Purpose: ${payload.purpose || "coach"}`,
    `User context: ${context}`,
    `User message: ${payload.prompt || ""}`,
  ].join("\n\n");

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 220,
    },
  });

  const models = (process.env.GEMINI_MODEL || "gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  let lastError = null;
  for (const model of models) {
    try {
      return await requestGeminiModel(model, apiKey, body);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Gemini request failed");
}

async function handleApi(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const text = await callGemini(payload);
    sendJson(res, 200, { text });
  } catch (error) {
    const status = /429|quota|rate/i.test(error.message) ? 429 : 500;
    sendJson(res, status, { error: error.message || "Gemini request failed" });
  }
}

function handleStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(root, `.${decodeURIComponent(requested)}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/gemini")) {
    handleApi(req, res);
    return;
  }
  handleStatic(req, res);
});

server.listen(port, () => {
  console.log(`Healyo running at http://localhost:${port}`);
});
