# microsoft-intern-hackathon-2026

**Aegis Dispatch** — a 911 Command View that acts as a real-time bias-correction
tool between a caller and the operator. It overlays interpretive tags on a
verbatim 911 transcript (never rewriting the caller's words), translates dialect
markers and slang, extracts entities, and syncs an interactive map to spoken
locations.

## Layout

```
backend/            FastAPI NLP middleware (simple functions, no classes)
  app.py            endpoints: /api/scenario, /api/export
  scenario.py       pre-loaded 911 scenario (lines stream in)
  rulebook.py       dialect/slang/entity rulebook + mock geocoder
  tagging.py        non-destructive line tagging
  agents/agent.py   Azure AI Foundry context agent (optional ML path)
  speech.py         Azure AI Speech transcription (optional live path)
frontend/           React + Tailwind + Framer Motion + react-leaflet
  src/components/    MapPane, TranscriptPane, Tag, EntitiesSidebar, PlaybackControls
```

## Run

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

## Demo

Hit **▶ Play**. The call streams in line-by-line: slang/medical terms get
color-coded tags (blue = location, green = medical, purple = action/intent,
yellow = vehicle), the map flies to "1420 Pine Street" when the address is
spoken, and the **Extracted Entities** panel fills with translations. Click any
tag for its meaning, or **⤓ Export Log** for a clean JSON dispatch summary.
