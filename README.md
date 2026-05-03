# Healyo

Healyo is a multi-agent AI wellness companion built for the GNEC Hackathon theme:
United Nations Sustainable Development Goal 3, Health and Well-being.

The platform combines a playful wellness companion with practical health-support
tools for daily habit tracking, symptom logging, medication reminders, mental
wellness exercises, safe triage guidance, health timelines, and caregiver-ready
reports. Healyo is designed as a preventive and supportive wellness product, not
as a replacement for doctors, emergency services, or professional medical care.

## Project Summary

| Item | Description |
| --- | --- |
| Project name | Healyo |
| Theme alignment | UN SDG 3: Health and Well-being |
| Primary goal | Help users track physical, mental, and emotional well-being through daily routines and AI support |
| Core concept | A multi-agent AI care team combined with an animated wellness companion |
| Target users | Students, families, caregivers, and people trying to build healthier routines |
| Data model | Offline-first browser storage using `localStorage` |
| AI integration | Gemini API through a Node.js backend proxy |
| Safety position | Wellness support, pattern detection, and urgency guidance without diagnosis or prescription |

## Key Features

| Area | Feature | Purpose |
| --- | --- | --- |
| Companion UX | Animated Healyo pet | Gives users a fun visual reward for healthy actions |
| Daily wellness | Quests | Converts hydration, sleep, movement, journaling, and calm practices into small tasks |
| Physical health | Hydration tracker | Tracks progress toward a daily water goal |
| Physical health | Movement tracker | Logs active minutes for the day |
| Physical health | Sleep tracker | Records last night's sleep and contributes to wellness scoring |
| Medication care | Medication reminders | Lets users add medicine name, dose, time, and mark doses as taken |
| Symptom care | Symptom log | Records symptoms, severity, notes, and repeated patterns |
| Mental wellness | Breathing timer | Provides a short guided reset for stress regulation |
| Mental wellness | Grounding exercise | Offers a simple sensory grounding technique |
| Emotional health | Mood check-in | Tracks daily mood state |
| Emotional health | Journal reflection | Saves notes and generates supportive AI reflection |
| AI support | AI Care Team | Provides specialized agents instead of a single generic chatbot |
| Safety | Triage screen | Classifies urgency as self-care, monitor, doctor soon, or emergency |
| History | Timeline | Shows logs across journals, symptoms, medication, and triage |
| Care sharing | Report generator | Creates a caregiver or doctor-friendly summary from user logs |
| Impact | SDG 3 impact screen | Explains how the product supports health and well-being goals |

## AI Care Team

Healyo uses a multi-agent structure so each type of health-support task has a
more focused role, prompt, and responsibility.

| Agent | Role | What It Does | Safety Boundary |
| --- | --- | --- | --- |
| Safe Triage Agent | Symptom urgency guidance | Reviews symptom text and severity to suggest a safe urgency level | Does not diagnose; recommends urgent care for red flags |
| Mind Coach Agent | Mental wellness | Supports stress, focus, sleep pressure, breathing, and burnout recovery | Provides non-clinical support only |
| Fitness Agent | Movement planning | Suggests gentle beginner-friendly movement routines | Avoids intense or medical exercise prescriptions |
| Nutrition Agent | Hydration and food habits | Suggests simple balanced habits for students and busy users | Avoids medical diet claims |
| Medication Agent | Medication adherence | Reviews reminders, missed doses, and adherence patterns | Does not prescribe or advise dose changes |
| Caregiver Agent | Care summaries | Converts logs into concise caregiver/professional updates | Summarizes user-provided data only |
| Insight Agent | Pattern detection | Identifies patterns across mood, sleep, symptoms, medication, movement, and hydration | Frames findings as observations, not diagnoses |

## Application Screens

| Screen | Description |
| --- | --- |
| Home | Displays the animated companion, wellness score, daily quests, open medication count, and current risk signal |
| Track | Includes mood check-in, journaling, hydration, movement, and sleep tracking |
| Care | Includes medication reminders, symptom logging, breathing, grounding, and support mode |
| AI Team | Provides access to the specialized AI agents |
| Triage | Runs safe symptom urgency guidance with red-flag detection |
| Timeline | Shows a filterable history of symptoms, journals, medications, and triage entries |
| Report | Generates a caregiver or doctor summary from stored logs |
| Impact | Explains the SDG 3 value and project positioning |
| Settings | Stores user profile, main goal, water goal, and emergency contact |

## Technical Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | HTML, CSS, JavaScript | Multi-screen app UI, animations, local state, wellness logic |
| Backend | Node.js HTTP server | Serves static files and proxies Gemini requests |
| AI provider | Gemini API | Generates agent responses and journal reflections |
| Storage | Browser `localStorage` | Stores profile, logs, medications, symptoms, triage, and journals locally |
| Deployment target | Google Cloud Run | Hosts frontend and backend together as one service |

## File Structure

| File | Purpose |
| --- | --- |
| `index.html` | Main application markup and screen structure |
| `styles.css` | Visual design, responsive layout, animations, drawer, and component styling |
| `script.js` | App state, localStorage, scoring, agents, triage, timeline, reports, and UI interactions |
| `server.js` | Node.js server and Gemini API proxy |
| `package.json` | Project metadata and start script |
| `.env.example` | Example environment variables for local setup |
| `.gitignore` | Prevents secrets and dependencies from being committed |
| `start-healyo.ps1` | Windows helper script for starting the local server |

## Local Setup

Install Node.js, then run:

```powershell
npm start
```

Open the app:

```text
http://localhost:4173
```

## Environment Variables

Create a local `.env` file for development. Do not commit this file.

```text
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
PORT=4173
```

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes for live AI | Gemini API key used only by the backend proxy |
| `GEMINI_MODEL` | Recommended | Gemini model name, currently `gemini-2.5-flash` |
| `PORT` | Optional | Local server port, default is `4173` |

## Data Privacy

Healyo currently stores user logs in browser `localStorage`.

| Question | Answer |
| --- | --- |
| Can other users see my logs? | No. Logs are stored locally in each user's browser |
| Does the app use a shared database? | No |
| Will a deployed version show one user's data to another user? | No, unless a shared backend database is added later |
| Is the Gemini key exposed in frontend code? | No. It is read server-side from environment variables |

## Safety and Medical Boundaries

Healyo is a wellness support tool. It is intentionally designed with guardrails.

| Boundary | Implementation |
| --- | --- |
| No diagnosis | Triage gives urgency guidance, not disease labels |
| No prescription | Medication Agent tracks reminders but does not suggest dose changes |
| Emergency escalation | Red-flag symptoms trigger urgent-care language |
| Professional care reminder | Reports and triage results state that Healyo does not replace clinicians |
| Local-first privacy | Personal logs stay in the user's browser |

## SDG 3 Impact

| SDG 3 Area | Healyo Contribution |
| --- | --- |
| Preventive health | Encourages daily hydration, sleep, movement, and journaling habits |
| Mental well-being | Provides breathing, grounding, reflection, and stress-support tools |
| Health literacy | Helps users understand patterns and safe next steps |
| Medication adherence | Supports reminders and missed-dose visibility |
| Care access | Generates summaries users can share with caregivers or professionals |
| Early risk awareness | Uses red-flag detection and triage categories to encourage timely care |

## Demo Flow

For a hackathon demo, a strong walkthrough is:

1. Open the Home screen and show Healyo's companion, score, and quests.
2. Log mood, sleep, hydration, movement, and a journal note on the Track screen.
3. Add a medication reminder and log a symptom on the Care screen.
4. Run Triage for a symptom and show safe urgency guidance.
5. Open AI Team and ask the Safe Triage Agent, Mind Coach Agent, and Insight Agent for specialized support.
6. Show the Timeline screen to demonstrate persistent health history.
7. Generate a caregiver or doctor summary on the Report screen.
8. Close with the Impact screen to connect the solution to SDG 3.

## Deployment Notes

Healyo can be deployed on Google Cloud Run because the project already includes a
Node.js server that serves both the frontend and backend proxy.

Recommended deployment approach:

| Step | Description |
| --- | --- |
| 1 | Add a Dockerfile for Cloud Run |
| 2 | Deploy the Node.js service to Cloud Run |
| 3 | Set `GEMINI_API_KEY` and `GEMINI_MODEL` as Cloud Run environment variables |
| 4 | Do not deploy or commit the local `.env` file |
| 5 | Test AI agents, triage, timeline, and report generation after deployment |

## Positioning

Healyo is best described as:

> A multi-agent AI wellness companion that helps users track physical, mental,
> and emotional health, identify early patterns, manage medication routines,
> and generate safe care summaries for caregivers or professionals through a
> playful companion experience.

