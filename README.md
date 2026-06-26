# TrueVoice: Reducing Algorithmic Bias in Speech Recognition for 911 Dispatch

> **TrueVoice uses AI to transform speech data into fair, reliable emergency-response decisions — advancing Microsoft's Responsible AI vision for underserved communities.**

**Keywords:** ASR · Inclusion AI · Responsible AI · Python · React · Speech Agent

TrueVoice is an **AI-for-Data** solution that corrects racial and dialect bias in automatic speech recognition (ASR) for 911 emergencies, so dispatchers can make accurate, equitable decisions.

---

## 🚨 Inspiration

In June 2026, the Seattle Fire Department faced controversy after using AI-assisted emergency call routing since 2023 — raising concerns about the transparency and accountability of language data in emergency decision-making.

At the center of this is a persistent, well-documented flaw in speech AI: **algorithmic racial bias.** Leading ASR systems make roughly **twice as many errors** for African American speakers as for white speakers saying the same words, and the gap widens with the use of African American Vernacular English (AAVE), foreign, and regional dialects.

When an emergency system misunderstands a caller, the consequence is that marginalized communities receive **lower-priority help** because of algorithmic bias.

So we asked: **How can we ensure AI-driven emergency systems use speech data to save lives — without amplifying bias?**

## ⚙️ The Solution

**TrueVoice** is a real-time support layer for Computer-Aided Dispatch (CAD) that helps 911 dispatchers understand emergency callers more accurately and fairly — especially when distress, accent, or AAVE/dialect would otherwise be misheard.

At its core is a purpose-built **AI dispatch-interpreter agent**. As the call streams in, the agent reads each line in context, recovers words a standard transcription mishears on AAVE and accented speech, explains what the caller actually *means*, and assembles a live, dialect-aware incident report. It **annotates and flags, never overrides** — the dispatcher stays in control.

- Preserves the caller's **verbatim transcript** (no rewriting of original speech)
- The agent **detects AAVE, slang, and regional phrasing** standard ASR misreads, showing what each was misheard as ("heard as X → means Y")
- **Surfaces under-triage & bias risk** — flags what could wrongly down-prioritize a call, and shows the agent's priority correction (e.g. High → Critical)
- Adds **context-aware interpretation tags** to clarify intent
- Extracts key dispatch entities (location, medical cues, urgency signals, actions)
- **Geocodes the spoken address** and syncs a live map to the caller's location
- Exports a structured incident summary for dispatch workflows

TrueVoice helps dispatchers understand what the caller *means*, not just what the transcript *looks like*.

## 🔮 Future Goals

TrueVoice is built to align with Microsoft's Responsible AI principles and its emphasis on language technology for marginalized communities — turning emergency speech data into a fairness checkpoint rather than a point of failure.

- **Inclusiveness** — extend beyond AAVE to Spanish, Indigenous, and accented English, building representative, consented dialect datasets with community linguists (data dignity, not data extraction).
- **Fairness** — continuously measure word-error-rate and triage-priority gaps across dialect groups, so bias is tracked and reduced, not assumed away.
- **Transparency & Accountability** — keep every interpretation explainable and auditable, end to end, with the dispatcher in control.
- **Reliability & Safety** — pilot with a real PSAP, integrate with existing CAD systems, and connect a live streaming ASR feed.

## 🏗️ Architecture

```
backend/           FastAPI service
  app.py           API: /api/scenario, /api/audio/{demo}, /api/tag, /api/report, /api/export
  client.py        OpenAI client (Whisper + GPT-4o)
  speech.py        Whisper transcription
  agent.py         live dialect-interpreter agent
  tagging.py       deterministic rulebook tagging
  rulebook.py      dialect/slang phrase rulebook
  scenario.py      fallback scenario for the CLI
  main.py          standalone CLI
  data/            cached transcripts
  audio_callls/    call recordings
frontend/          React + Vite + Tailwind + Framer Motion + react-leaflet
  src/App.jsx      app shell, playback, state
  src/api.js       backend client
  src/sentiment.js caller-sentiment estimate
  src/components/   MapPane, TranscriptPane, TranscriptLine, Tag, ReportPopup, PlaybackControls
```

## ▶️ Run

Set `OPENAI_API_KEY` in `backend/.env`.

### Backend (FastAPI on :8000)

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8000
```

### Frontend (Vite on :5173)

Requires Node.js 18+.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` → the backend.

## 🎬 Demo

Pick a call from **Incoming Calls** (Kenneth Walker — a real shooting report; or the disguised "3 year old" call) and hit **▶ Play**. The audio streams with a synced, speaker-labeled transcript.

Toggle **Interpretation**:
- **Off** — the raw transcript, including the words a standard system mishears (flagged low-confidence).
- **On** — the agent recovers and explains those words, fills the incident report, flags under-triage risk, escalates priority, and flies the map to the caller's location.

## 📚 References

- Koenecke et al. (2020), *Racial disparities in automated speech recognition*, **PNAS**.
- Koenecke et al. (2024), *Careless Whisper: Speech-to-Text Hallucination Harms*, **ACM FAccT**.
- Hofmann, Kalluri, Jurafsky & King (2024), *Dialect prejudice predicts AI decisions about people's character, employability, and criminality*, **Nature**.

