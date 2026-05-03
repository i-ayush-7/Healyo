const storageKey = "healyo-v3";
const todayKey = new Date().toISOString().slice(0, 10);

const questBank = {
  low: [
    ["SUN", "Tiny sunlight reset", "Step outside or sit near daylight for 3 minutes.", "emotional"],
    ["H2O", "Gentle hydration", "Drink one glass of water and take three slow breaths.", "physical"],
    ["LOG", "One-line journal", "Write one sentence about what would make today easier.", "emotional"],
    ["PM", "Rest cue", "Choose a bedtime wind-down time for tonight.", "physical"],
  ],
  stressed: [
    ["ZEN", "Box breathing", "Breathe in, hold, out, hold for four counts each.", "mental"],
    ["GO", "Move the stress", "Walk or stretch for 5 minutes.", "physical"],
    ["1X", "One next step", "Write the smallest task you can finish in 10 minutes.", "mental"],
    ["H2O", "Refill ritual", "Refill your bottle before the next work block.", "physical"],
  ],
  okay: [
    ["H2O", "Hydration boost", "Drink water before your next meal or snack.", "physical"],
    ["MOVE", "Stretch break", "Do neck, shoulder, and wrist stretches for 4 minutes.", "physical"],
    ["PM", "Sleep prep", "Set screens aside 20 minutes earlier tonight.", "physical"],
    ["JOY", "Gratitude ping", "Name one thing your body helped you do today.", "emotional"],
  ],
  great: [
    ["GO", "Energy share", "Use your momentum for a 10-minute walk.", "physical"],
    ["FOOD", "Color snack", "Add one fruit or vegetable to your next snack.", "physical"],
    ["CHAT", "Check on someone", "Send a kind message to one person.", "emotional"],
    ["PM", "Protect the win", "Plan the bedtime that keeps tomorrow strong.", "physical"],
  ],
};

const agents = [
  {
    id: "triage",
    role: "Triage",
    name: "Safe Triage Agent",
    badge: "TRI",
    color: "coral",
    description: "Checks symptoms for urgency signals and recommends safe next steps without diagnosing.",
    prompt: "Act as Healyo's safe triage agent. Do not diagnose. Classify urgency and explain safe next steps.",
  },
  {
    id: "mind",
    role: "Mental Health",
    name: "Mind Coach Agent",
    badge: "MIND",
    color: "blue",
    description: "Supports stress, focus, sleep pressure, breathing, and burnout recovery.",
    prompt: "Act as Healyo's mind coach. Give practical, supportive, non-clinical mental wellness guidance.",
  },
  {
    id: "fitness",
    role: "Movement",
    name: "Fitness Agent",
    badge: "FIT",
    color: "teal",
    description: "Builds beginner-friendly movement plans around energy, time, and safety.",
    prompt: "Act as Healyo's fitness agent. Suggest gentle, safe, beginner-friendly movement plans.",
  },
  {
    id: "nutrition",
    role: "Nutrition",
    name: "Nutrition Agent",
    badge: "NUT",
    color: "gold",
    description: "Suggests simple hydration and food habits for students and busy families.",
    prompt: "Act as Healyo's nutrition agent. Suggest simple balanced food and hydration habits without medical diet claims.",
  },
  {
    id: "medication",
    role: "Medication",
    name: "Medication Agent",
    badge: "MED",
    color: "rose",
    description: "Reviews reminders, missed doses, and adherence patterns with safe medication boundaries.",
    prompt: "Act as Healyo's medication adherence agent. Do not prescribe. Remind users to follow professional instructions.",
  },
  {
    id: "caregiver",
    role: "Caregiver",
    name: "Caregiver Agent",
    badge: "CARE",
    color: "ink",
    description: "Turns daily logs into clear updates for caregivers or professionals.",
    prompt: "Act as Healyo's caregiver summary agent. Create clear, concise summaries from user logs.",
  },
  {
    id: "insight",
    role: "Pattern Detection",
    name: "Insight Agent",
    badge: "DATA",
    color: "teal",
    description: "Finds patterns across sleep, mood, symptoms, movement, hydration, and medication.",
    prompt: "Act as Healyo's insight agent. Identify patterns from logs and explain what might be worth monitoring.",
  },
];

const defaults = {
  profile: {
    name: "",
    goal: "reduce stress",
    waterGoal: 8,
    contact: "",
  },
  today: {
    date: todayKey,
    mood: "low",
    water: 0,
    movement: 0,
    sleep: 0,
    calmSessions: 0,
    completedQuests: [],
    medsTaken: [],
  },
  history: [],
  journals: [],
  meds: [],
  symptoms: [],
  triage: [],
};

let data = loadData();
let breathTimer = null;
let breathRemaining = 0;
let activeAgentId = "mind";
let timelineFilter = "all";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const nodes = {
  pet: $("#pet"),
  toast: $("#toast"),
  questList: $("#questList"),
  reflectionOutput: $("#reflectionOutput"),
  journalInput: $("#journalInput"),
  petMoodLabel: $("#petMoodLabel"),
  streakLabel: $("#streakLabel"),
  petLevel: $("#petLevel"),
  aiMode: $("#aiMode"),
  agentChatWindow: $("#agentChatWindow"),
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) || JSON.parse(localStorage.getItem("healyo-v2"));
    if (!saved) return structuredClone(defaults);
    const merged = {
      ...structuredClone(defaults),
      ...saved,
      profile: { ...defaults.profile, ...(saved.profile || {}) },
      today: { ...defaults.today, ...(saved.today || {}) },
      triage: saved.triage || [],
    };
    if (merged.today.date !== todayKey) {
      merged.history = [merged.today, ...(merged.history || [])].slice(0, 21);
      merged.today = structuredClone(defaults.today);
    }
    return merged;
  } catch {
    return structuredClone(defaults);
  }
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function score() {
  const waterGoal = Number(data.profile.waterGoal) || 8;
  const physical = Math.round(
    Math.min(data.today.water / waterGoal, 1) * 35 +
    Math.min(data.today.movement / 45, 1) * 35 +
    sleepQuality(data.today.sleep) * 30
  );
  const mental = Math.round(
    Math.min(data.today.calmSessions / 2, 1) * 45 +
    questRatio("mental") * 35 +
    (data.today.mood === "stressed" ? 5 : 20)
  );
  const emotional = Math.round(
    (data.journals.some((entry) => entry.date === todayKey) ? 40 : 0) +
    questRatio("emotional") * 40 +
    moodValue(data.today.mood) * 20
  );
  return {
    physical: clamp(physical),
    mental: clamp(mental),
    emotional: clamp(emotional),
    total: clamp(Math.round((physical + mental + emotional) / 3)),
  };
}

function sleepQuality(hours) {
  if (!hours) return 0;
  if (hours >= 7 && hours <= 9) return 1;
  if (hours >= 6 && hours < 7) return 0.75;
  if (hours > 9 && hours <= 10) return 0.75;
  return 0.38;
}

function moodValue(mood) {
  return { low: 0.25, stressed: 0.35, okay: 0.7, great: 1 }[mood] || 0.5;
}

function questRatio(type) {
  const quests = questBank[data.today.mood] || questBank.low;
  const typed = quests.map((quest, index) => ({ quest, index })).filter((item) => item.quest[3] === type);
  if (!typed.length) return 0;
  const done = typed.filter((item) => data.today.completedQuests.includes(item.index)).length;
  return done / typed.length;
}

function renderAll() {
  renderProfile();
  renderMood();
  renderQuests();
  renderTrackers();
  renderMeds();
  renderSymptoms();
  renderPet();
  renderInsights();
  renderSupport();
  renderAgents();
  renderTimeline();
  renderTriageStatus();
  saveData();
}

function showScreen(screen) {
  $$(".screen").forEach((item) => item.classList.toggle("active", item.id === `screen-${screen}`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.screenLink === screen));
  $("#mobileScreenSelect").value = screen;
  window.location.hash = screen;
}

function renderProfile() {
  $("#nameInput").value = data.profile.name;
  $("#goalInput").value = data.profile.goal;
  $("#waterGoalInput").value = data.profile.waterGoal;
  $("#contactInput").value = data.profile.contact;
}

function renderMood() {
  $$(".mood-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === data.today.mood);
  });
}

function renderQuests() {
  nodes.questList.innerHTML = "";
  questBank[data.today.mood].forEach(([icon, title, description], index) => {
    const done = data.today.completedQuests.includes(index);
    const item = document.createElement("article");
    item.className = `quest${done ? " done" : ""}`;
    item.innerHTML = `
      <span class="quest-icon">${icon}</span>
      <div>
        <strong>${title}</strong>
        <p>${description}</p>
      </div>
      <button type="button">${done ? "Done" : "Complete"}</button>
    `;
    item.querySelector("button").addEventListener("click", () => completeQuest(index));
    nodes.questList.appendChild(item);
  });
}

function renderTrackers() {
  const waterGoal = Number(data.profile.waterGoal) || 8;
  const waterPercent = clamp(Math.round((data.today.water / waterGoal) * 100));
  $("#waterLabel").textContent = `${data.today.water} / ${waterGoal}`;
  $("#waterPercent").textContent = `${waterPercent}%`;
  $("#movementInput").value = data.today.movement;
  $("#movementLabel").textContent = `${data.today.movement} min`;
  $("#sleepInput").value = data.today.sleep;
  $("#sleepLabel").textContent = `${data.today.sleep} hours`;
}

function renderMeds() {
  const medList = $("#medList");
  medList.innerHTML = "";
  if (!data.meds.length) {
    medList.innerHTML = `<div class="mini-item"><div><strong>No medicines yet</strong><p>Add a reminder to make Healyo useful for real care routines.</p></div></div>`;
    return;
  }
  data.meds.forEach((med) => {
    const taken = data.today.medsTaken.includes(med.id);
    const item = document.createElement("div");
    item.className = "mini-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(med.name)} at ${med.time}</strong>
        <p>${escapeHtml(med.dose)} - ${taken ? "marked taken today" : "waiting for today's dose"}</p>
      </div>
      <button type="button" class="${taken ? "done" : ""}">${taken ? "Taken" : "Mark"}</button>
    `;
    item.querySelector("button").addEventListener("click", () => toggleMed(med.id));
    medList.appendChild(item);
  });
}

function renderSymptoms() {
  $("#severityLabel").textContent = $("#severityInput").value;
  const symptomList = $("#symptomList");
  symptomList.innerHTML = "";
  const latest = data.symptoms.slice(0, 5);
  if (!latest.length) {
    symptomList.innerHTML = `<div class="mini-item"><div><strong>No symptoms logged</strong><p>Track patterns without diagnosing yourself.</p></div></div>`;
    return;
  }
  latest.forEach((symptom) => {
    const item = document.createElement("div");
    item.className = "mini-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(symptom.name)} - ${symptom.severity}/10</strong>
        <p>${symptom.date}${symptom.note ? ` - ${escapeHtml(symptom.note)}` : ""}</p>
      </div>
      <button type="button">View</button>
    `;
    item.querySelector("button").addEventListener("click", () => showToast(symptomAdvice(symptom)));
    symptomList.appendChild(item);
  });
}

function renderPet() {
  const wellness = score();
  $("#physicalBar").style.width = `${wellness.physical}%`;
  $("#mentalBar").style.width = `${wellness.mental}%`;
  $("#emotionalBar").style.width = `${wellness.emotional}%`;
  $("#todayScore").textContent = `${wellness.total}%`;
  $("#entryCount").textContent = String(data.journals.length + data.symptoms.length + data.meds.length + data.triage.length);
  $("#openMedCount").textContent = String(Math.max(0, data.meds.length - data.today.medsTaken.length));

  const level = Math.max(1, Math.ceil(wellness.total / 25));
  nodes.petLevel.textContent = String(level);
  nodes.pet.classList.toggle("pet-stage-2", wellness.total >= 45);
  nodes.pet.classList.toggle("pet-stage-3", wellness.total >= 75);
  nodes.petMoodLabel.textContent = wellness.total >= 75 ? "Thriving" : wellness.mental >= 65 ? "Peaceful" : wellness.physical >= 65 ? "Bouncy" : "Curious";
  nodes.streakLabel.textContent = `${streakCount()} day streak`;
}

function renderInsights() {
  const wellness = score();
  const symptomPattern = repeatedSymptom();
  const medMisses = data.meds.length - data.today.medsTaken.length;
  let summary = `${data.profile.name || "You"} are focusing on ${data.profile.goal}. Today's balance is ${wellness.total}%, with physical ${wellness.physical}%, mental ${wellness.mental}%, and emotional ${wellness.emotional}%.`;
  if (symptomPattern) {
    summary += ` Pattern noticed: ${symptomPattern.name} has appeared ${symptomPattern.count} times recently.`;
  }
  if (medMisses > 0) {
    summary += ` ${medMisses} medication reminder${medMisses === 1 ? " is" : "s are"} still open today.`;
  }
  $("#weeklySummary").textContent = summary;
}

function renderSupport() {
  $("#supportContact").textContent = data.profile.contact || "No contact saved";
}

function renderAgents() {
  const grid = $("#agentGrid");
  grid.innerHTML = "";
  agents.forEach((agent) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `agent-card ${agent.color}${activeAgentId === agent.id ? " active" : ""}`;
    card.innerHTML = `
      <span>${agent.badge}</span>
      <strong>${agent.name}</strong>
      <small>${agent.description}</small>
    `;
    card.addEventListener("click", () => setActiveAgent(agent.id));
    grid.appendChild(card);
  });
  const active = getActiveAgent();
  $("#activeAgentRole").textContent = active.role;
  $("#activeAgentName").textContent = active.name;
}

function renderTimeline() {
  const list = $("#timelineList");
  const items = timelineItems().filter((item) => timelineFilter === "all" || item.type === timelineFilter);
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="timeline-item"><strong>No timeline entries yet</strong><p>Log symptoms, journals, medicines, or triage results to build a useful history.</p></div>`;
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `timeline-item ${item.type}`;
    row.innerHTML = `<span>${item.badge}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div>`;
    list.appendChild(row);
  });
}

function renderTriageStatus() {
  const latest = data.triage[0];
  const label = latest ? latest.level : "Low";
  $("#riskLevelLabel").textContent = label;
}

function setActiveAgent(id) {
  activeAgentId = id;
  renderAgents();
  const active = getActiveAgent();
  addAgentMessage(`You are now talking with ${active.name}. ${active.description}`, "pet-message");
}

function getActiveAgent() {
  return agents.find((agent) => agent.id === activeAgentId) || agents[1];
}

function completeQuest(index) {
  if (data.today.completedQuests.includes(index)) return;
  data.today.completedQuests.push(index);
  animatePet();
  showToast("Quest complete. Healyo grew from a real healthy action.");
  renderAll();
}

function toggleMed(id) {
  const set = new Set(data.today.medsTaken);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  data.today.medsTaken = [...set];
  animatePet();
  renderAll();
}

function streakCount() {
  const activeToday = score().total >= 30 || data.journals.some((entry) => entry.date === todayKey);
  const historyDays = data.history.filter((day) => {
    const waterGoal = Number(data.profile.waterGoal) || 8;
    return day.water >= Math.ceil(waterGoal / 2) || day.completedQuests?.length || day.calmSessions;
  }).length;
  return activeToday ? historyDays + 1 : historyDays;
}

function repeatedSymptom() {
  const counts = data.symptoms.reduce((acc, symptom) => {
    const key = symptom.name.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const found = Object.entries(counts).find(([, count]) => count >= 2);
  return found ? { name: found[0], count: found[1] } : null;
}

function symptomAdvice(symptom) {
  if (Number(symptom.severity) >= 8 || hasRedFlag(symptom.name + " " + symptom.note)) {
    return "High concern logged. If symptoms feel severe, sudden, or unsafe, seek urgent professional care or emergency help.";
  }
  return "Symptom saved. If it keeps returning or gets worse, consider talking to a healthcare professional.";
}

function hasRedFlag(text) {
  return /chest pain|trouble breathing|shortness of breath|faint|fainted|severe bleeding|suicidal|self harm|stroke|confusion|allergic|swelling throat|seizure|unconscious|worst headache|sudden weakness/i.test(text);
}

function triageLevel(text, severity) {
  if (hasRedFlag(text) || severity >= 9) return "Emergency";
  if (/fever|infection|vomit|dehydration|migraine|panic|severe|persistent/i.test(text) || severity >= 7) return "Doctor Soon";
  if (severity >= 4) return "Monitor";
  return "Self-care";
}

function triageMessage(text, severity) {
  const level = triageLevel(text, severity);
  const base = {
    Emergency: "Urgent red flags may be present. If this is happening now, contact local emergency services or a trusted adult immediately.",
    "Doctor Soon": "This may need professional attention soon, especially if it is worsening, persistent, or unusual for you.",
    Monitor: "Track it, rest, hydrate, and watch for changes. Seek care if it worsens, persists, or new warning signs appear.",
    "Self-care": "This looks suitable for basic self-care and monitoring based on what you entered. Keep logging patterns.",
  }[level];
  return { level, text: `${base} Healyo does not diagnose; it helps you decide a safer next step.` };
}

function detectTheme(text) {
  const lower = text.toLowerCase();
  if (/sleep|tired|exhausted|bed|rest/.test(lower)) return "sleep";
  if (/exam|study|work|focus|deadline|busy/.test(lower)) return "focus";
  if (/alone|friend|family|lonely|miss/.test(lower)) return "social";
  if (/walk|exercise|body|stiff|pain|sore/.test(lower)) return "movement";
  if (/water|headache|dry|thirst/.test(lower)) return "hydration";
  if (/medicine|medication|dose|pill/.test(lower)) return "medication";
  return "calm";
}

function localCoachReply(text, agent = getActiveAgent()) {
  if (agent.id === "triage") {
    const result = triageMessage(text, 5);
    return `${result.level}: ${result.text}`;
  }
  if (agent.id === "fitness") return "Try a gentle 8-minute plan: 2 minutes walking, 2 minutes shoulder and neck mobility, 2 minutes light squats or sit-to-stands, and 2 minutes slow breathing.";
  if (agent.id === "nutrition") return "Start simple: one glass of water now, one protein or fiber source with your next meal, and one colorful fruit or vegetable today.";
  if (agent.id === "medication") return "Check your reminder list and mark only doses you actually took. Do not double-dose or change medication unless your clinician told you to.";
  if (agent.id === "caregiver") return generateReport();
  if (agent.id === "insight") return buildPatternInsight();

  const theme = detectTheme(text);
  const replies = {
    sleep: "Let's make rest feel possible. Dim one light, put your phone away from the bed, and give yourself a 15-minute landing zone.",
    focus: "Your next quest is tiny: write the first step, start a 10-minute timer, and stop when it rings. Momentum counts.",
    social: "Connection can be small. Send one low-pressure message like, \"Thinking of you today.\" Healyo will count that as care.",
    movement: "Stand up, roll your shoulders, and walk for two minutes. Small movement tells your nervous system you are safe.",
    hydration: "Water quest unlocked. Take a sip now, then refill the bottle so the next healthy choice is already prepared.",
    medication: "Medication routines work best when they are visible. Check your reminder list and mark only what you actually took.",
    calm: "Try this with me: inhale for four, exhale for six, three times. No perfect mood required.",
  };
  return replies[theme];
}

async function askHealyo(prompt, purpose, agent = getActiveAgent()) {
  const context = {
    activeAgent: agent,
    profile: data.profile,
    today: data.today,
    recentSymptoms: data.symptoms.slice(0, 8),
    recentJournals: data.journals.slice(0, 5),
    medicines: data.meds,
    triage: data.triage.slice(0, 3),
    instruction: agent.prompt,
  };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: `${agent.prompt}\n\n${prompt}`, purpose, context }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "Gemini unavailable");
    }
    const result = await response.json();
    nodes.aiMode.textContent = "Gemini";
    return result.text || localCoachReply(prompt, agent);
  } catch (error) {
    nodes.aiMode.textContent = "Local AI";
    if (/429|quota|rate/i.test(error.message)) showToast("Gemini quota is busy, so Healyo used local AI.");
    return purpose === "plan" ? localPlan() : localCoachReply(prompt, agent);
  } finally {
    window.clearTimeout(timeout);
  }
}

function localPlan() {
  const wellness = score();
  const waterGoal = Number(data.profile.waterGoal) || 8;
  return `Today's Healyo plan: drink ${Math.max(1, waterGoal - data.today.water)} more water glass(es), complete ${data.today.movement < 20 ? "a 10-minute walk or stretch" : "one light cooldown"}, use one breathing reset, and write one sentence about your ${data.profile.goal} goal. Current balance: ${wellness.total}%.`;
}

async function saveReflection() {
  const note = nodes.journalInput.value.trim();
  const mindAgent = agents.find((agent) => agent.id === "mind");
  const prompt = note || `Mood is ${data.today.mood}. Goal is ${data.profile.goal}.`;
  const text = await askHealyo(prompt, "reflection", mindAgent);
  nodes.reflectionOutput.textContent = text;
  data.journals.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    mood: data.today.mood,
    note,
    reflection: text,
    createdAt: new Date().toISOString(),
  });
  nodes.journalInput.value = "";
  data.today.calmSessions += 1;
  animatePet();
  renderAll();
}

function addAgentMessage(text, className) {
  const message = document.createElement("div");
  message.className = `message ${className}`;
  message.textContent = text;
  nodes.agentChatWindow.appendChild(message);
  nodes.agentChatWindow.scrollTop = nodes.agentChatWindow.scrollHeight;
}

function timelineItems() {
  const meds = data.meds.map((med) => ({
    type: "med",
    badge: "MED",
    title: `${med.name} reminder`,
    detail: `${med.dose} at ${med.time}`,
    createdAt: med.createdAt,
  }));
  const symptoms = data.symptoms.map((symptom) => ({
    type: "symptom",
    badge: "SYM",
    title: `${symptom.name} severity ${symptom.severity}/10`,
    detail: `${symptom.date}${symptom.note ? ` - ${symptom.note}` : ""}`,
    createdAt: symptom.createdAt,
  }));
  const journals = data.journals.map((entry) => ({
    type: "journal",
    badge: "LOG",
    title: `${entry.mood} mood journal`,
    detail: entry.note || entry.reflection,
    createdAt: entry.createdAt,
  }));
  const triage = data.triage.map((entry) => ({
    type: "symptom",
    badge: "TRI",
    title: `${entry.level} triage`,
    detail: entry.summary,
    createdAt: entry.createdAt,
  }));
  return [...meds, ...symptoms, ...journals, ...triage].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function generateReport() {
  const wellness = score();
  const symptoms = data.symptoms.slice(0, 5).map((item) => `- ${item.date}: ${item.name}, severity ${item.severity}/10${item.note ? `, ${item.note}` : ""}`).join("\n") || "- No symptoms logged.";
  const meds = data.meds.map((med) => `- ${med.name} ${med.dose} at ${med.time}: ${data.today.medsTaken.includes(med.id) ? "taken today" : "not marked taken today"}`).join("\n") || "- No medications added.";
  const journals = data.journals.slice(0, 3).map((entry) => `- ${entry.date}: mood ${entry.mood}${entry.note ? `, note: ${entry.note}` : ""}`).join("\n") || "- No journal entries.";
  return [
    "HEALYO CARE SUMMARY",
    `Date: ${todayKey}`,
    `Name: ${data.profile.name || "Not provided"}`,
    `Goal: ${data.profile.goal}`,
    `Emergency contact: ${data.profile.contact || "Not provided"}`,
    "",
    "Today",
    `- Wellness score: ${wellness.total}%`,
    `- Physical/Mental/Emotional: ${wellness.physical}% / ${wellness.mental}% / ${wellness.emotional}%`,
    `- Water: ${data.today.water}/${data.profile.waterGoal} glasses`,
    `- Movement: ${data.today.movement} minutes`,
    `- Sleep: ${data.today.sleep} hours`,
    `- Mood: ${data.today.mood}`,
    "",
    "Medications",
    meds,
    "",
    "Recent symptoms",
    symptoms,
    "",
    "Recent emotional notes",
    journals,
    "",
    "Pattern insight",
    buildPatternInsight(),
    "",
    "Safety note",
    "Healyo does not diagnose or replace a clinician. Severe, sudden, persistent, or unsafe symptoms should be handled by professional care or emergency services.",
  ].join("\n");
}

function buildPatternInsight() {
  const pattern = repeatedSymptom();
  const lowSleep = data.today.sleep > 0 && data.today.sleep < 6;
  const medMisses = Math.max(0, data.meds.length - data.today.medsTaken.length);
  const parts = [];
  if (pattern) parts.push(`${pattern.name} appears ${pattern.count} times in recent logs.`);
  if (lowSleep) parts.push("Sleep is below 6 hours today, which can affect mood, headaches, focus, and energy.");
  if (data.today.movement >= 20) parts.push("Movement is supporting the physical score today.");
  if (medMisses) parts.push(`${medMisses} medication reminder${medMisses === 1 ? " is" : "s are"} still open.`);
  if (!parts.length) parts.push("No strong risk pattern yet. More daily logs will make insights stronger.");
  return parts.join(" ");
}

function animatePet() {
  nodes.pet.classList.remove("complete");
  void nodes.pet.offsetWidth;
  nodes.pet.classList.add("complete");
}

function showToast(message) {
  nodes.toast.textContent = message;
  nodes.toast.classList.add("show");
  window.setTimeout(() => nodes.toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wireEvents() {
  $("#drawerToggle").addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    $("#drawerToggle").setAttribute("aria-expanded", String(!collapsed));
  });

  $$("[data-screen-link]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      showScreen(item.dataset.screenLink);
    });
  });
  $("#mobileScreenSelect").addEventListener("change", (event) => showScreen(event.target.value));

  $("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    data.profile.name = $("#nameInput").value.trim();
    data.profile.goal = $("#goalInput").value;
    data.profile.waterGoal = clamp($("#waterGoalInput").value) || 8;
    data.profile.contact = $("#contactInput").value.trim();
    showToast("Profile saved. Healyo will personalize around it.");
    renderAll();
  });

  $$(".mood-btn").forEach((button) => {
    button.addEventListener("click", () => {
      data.today.mood = button.dataset.mood;
      data.today.completedQuests = [];
      renderAll();
    });
  });

  $("#reflectBtn").addEventListener("click", saveReflection);
  $("#refreshQuests").addEventListener("click", () => {
    data.today.completedQuests = [];
    showToast("Healyo refreshed today's quests.");
    renderAll();
  });

  $("[data-action='waterDown']").addEventListener("click", () => {
    data.today.water = Math.max(0, data.today.water - 1);
    renderAll();
  });
  $("[data-action='waterUp']").addEventListener("click", () => {
    data.today.water += 1;
    animatePet();
    renderAll();
  });
  $("#movementInput").addEventListener("input", (event) => {
    data.today.movement = Number(event.target.value);
    renderAll();
  });
  $("#sleepInput").addEventListener("input", (event) => {
    data.today.sleep = Number(event.target.value);
    renderAll();
  });

  $("#medForm").addEventListener("submit", (event) => {
    event.preventDefault();
    data.meds.unshift({
      id: crypto.randomUUID(),
      name: $("#medName").value.trim(),
      dose: $("#medDose").value.trim(),
      time: $("#medTime").value,
      createdAt: new Date().toISOString(),
    });
    event.target.reset();
    showToast("Medication reminder added.");
    renderAll();
  });

  $("#severityInput").addEventListener("input", () => $("#severityLabel").textContent = $("#severityInput").value);
  $("#symptomForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const symptom = {
      id: crypto.randomUUID(),
      date: todayKey,
      name: $("#symptomName").value.trim(),
      severity: Number($("#severityInput").value),
      note: $("#symptomNote").value.trim(),
      createdAt: new Date().toISOString(),
    };
    data.symptoms.unshift(symptom);
    event.target.reset();
    $("#severityInput").value = 3;
    showToast(symptomAdvice(symptom));
    renderAll();
  });

  $("#breathBtn").addEventListener("click", startBreathing);
  $("#groundingBtn").addEventListener("click", () => {
    $("#calmOutput").textContent = "Grounding: name 5 things you see, 4 things you feel, 3 sounds, 2 smells, and 1 thing you can do next.";
    data.today.calmSessions += 1;
    animatePet();
    renderAll();
  });
  $("#supportBtn").addEventListener("click", () => {
    const card = $("#supportCard");
    card.hidden = !card.hidden;
    renderSupport();
  });

  $("#agentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#agentInput");
    const text = input.value.trim();
    if (!text) return;
    const agent = getActiveAgent();
    addAgentMessage(text, "user-message");
    input.value = "";
    addAgentMessage(`${agent.name} is reviewing your context...`, "pet-message");
    const reply = await askHealyo(text, `agent-${agent.id}`, agent);
    nodes.agentChatWindow.lastElementChild.textContent = reply;
  });

  $("#agentPlanBtn").addEventListener("click", async () => {
    const agent = getActiveAgent();
    addAgentMessage("Use my logs and give me your best next step.", "user-message");
    addAgentMessage(`${agent.name} is reviewing your context...`, "pet-message");
    const reply = await askHealyo("Use my logs and give me your best next step.", `agent-${agent.id}`, agent);
    nodes.agentChatWindow.lastElementChild.textContent = reply;
  });

  $("#triageSeverity").addEventListener("input", () => $("#triageSeverityLabel").textContent = $("#triageSeverity").value);
  $("#triageBtn").addEventListener("click", async () => {
    const text = $("#triageInput").value.trim();
    const severity = Number($("#triageSeverity").value);
    const result = triageMessage(text, severity);
    data.triage.unshift({
      id: crypto.randomUUID(),
      date: todayKey,
      level: result.level,
      severity,
      summary: text || "No detail provided",
      advice: result.text,
      createdAt: new Date().toISOString(),
    });
    $("#triageResult").innerHTML = `
      <p class="eyebrow">Result</p>
      <h2>${result.level}</h2>
      <p class="ai-output">${escapeHtml(result.text)}</p>
      <p class="loading-note">Healyo AI is refining this explanation...</p>
    `;
    renderAll();
    const triageAgent = agents.find((agent) => agent.id === "triage");
    const aiText = await askHealyo(`Symptoms: ${text}. Severity: ${severity}. Local triage result: ${result.level}.`, "triage", triageAgent);
    $("#triageResult").innerHTML = `
      <p class="eyebrow">Result</p>
      <h2>${result.level}</h2>
      <p class="ai-output">${escapeHtml(aiText)}</p>
    `;
    if (result.level === "Emergency") showScreen("triage");
  });

  $$(".timeline-filter").forEach((button) => {
    button.addEventListener("click", () => {
      timelineFilter = button.dataset.filter;
      $$(".timeline-filter").forEach((item) => item.classList.toggle("active", item === button));
      renderTimeline();
    });
  });

  $("#reportBtn").addEventListener("click", () => {
    $("#careReport").textContent = generateReport();
  });
  $("#copyReportBtn").addEventListener("click", async () => {
    const report = $("#careReport").textContent;
    await navigator.clipboard.writeText(report);
    showToast("Care report copied.");
  });
}

function startBreathing() {
  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
    $("#breathCircle").classList.remove("active");
    $("#breathText").textContent = "Ready";
    $("#breathBtn").textContent = "Start 60s";
    return;
  }

  breathRemaining = 60;
  $("#breathCircle").classList.add("active");
  $("#breathBtn").textContent = "Stop";
  breathTimer = setInterval(() => {
    breathRemaining -= 1;
    const phase = breathRemaining % 8;
    $("#breathText").textContent = phase > 4 ? "Exhale" : "Inhale";
    $("#calmOutput").textContent = `${breathRemaining}s left. Keep the breath slow and comfortable.`;
    if (breathRemaining <= 0) {
      clearInterval(breathTimer);
      breathTimer = null;
      $("#breathCircle").classList.remove("active");
      $("#breathText").textContent = "Done";
      $("#breathBtn").textContent = "Start 60s";
      $("#calmOutput").textContent = "Reset complete. Notice one thing that feels even slightly steadier.";
      data.today.calmSessions += 1;
      animatePet();
      renderAll();
    }
  }, 1000);
}

wireEvents();
renderAll();
showScreen((window.location.hash || "#home").replace("#", "") || "home");
