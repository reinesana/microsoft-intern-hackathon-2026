"""
DESCRIPTION:
    FastAPI backend for Aegis Dispatch. Transcribes the real 911 audio clip with
    OpenAI Whisper, streams those lines into the UI, tags any transcript line
    live through the OpenAI AAVE dispatch tagger, and exports a clean dispatch
    log.

    The OpenAI client is created once at startup and lives for the lifetime of
    the server. The transcript is cached to disk so the server doesn't re-bill
    Whisper on every reload. Kept deliberately simple: plain functions, plain
    dicts, no classes.

USAGE:
    uvicorn app:app --reload --port 8000

    Endpoints:
        GET  /api/scenario   transcript lines (from the real audio) + EMS units
        GET  /api/export     downloadable dispatch log (tags grouped by entity)
        GET  /api/audio      the raw 911 audio clip (for playback)
        POST /api/tag        live AAVE agent tagging for one transcript line
"""

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from client import make_client, CHAT_MODEL, TRANSCRIBE_MODEL
from scenario import SCENARIO
from rulebook import CATEGORY_COLORS
from tagging import tag_line as rulebook_tags
from agent import tag_line as agent_tags
from speech import transcribe

load_dotenv()

app = FastAPI(title="Aegis Dispatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# The real 911 audio clip and a disk cache for its transcript.
AUDIO_PATH = Path("audio_callls/audiowav.mp3")
TRANSCRIPT_CACHE = Path("data/transcript.json")

# OpenAI client lives for the lifetime of the server.
client = make_client()


def diarize(texts):
    """Label each transcript line as Dispatcher or Caller using the chat model."""
    if not texts:
        return []

    numbered = "\n".join(f"{i}. {t}" for i, t in enumerate(texts, start=1))
    messages = [
        {
            "role": "system",
            "content": (
                "You label each line of a 911 call transcript with who is "
                'speaking. There are two speakers: "Dispatcher" and "Caller". '
                "The dispatcher asks the questions and gives instructions; the "
                "caller is the person reporting the emergency. Return ONLY JSON "
                'of the form {"speakers": [...]} with exactly one label per '
                "numbered line, in order."
            ),
        },
        {"role": "user", "content": numbered},
    ]

    def _ask(temperature):
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=messages,
        )
        try:
            return json.loads(resp.choices[0].message.content).get("speakers", [])
        except (json.JSONDecodeError, AttributeError, TypeError):
            return []

    speakers = _ask(0)
    # Guard against a degenerate answer where every line gets the same label
    # (the model occasionally collapses to all-"Caller"); retry with a nudge.
    if len(set(speakers[: len(texts)])) < 2:
        speakers = _ask(0.4)

    return [
        speakers[i] if i < len(speakers) and speakers[i] in ("Dispatcher", "Caller") else "Caller"
        for i in range(len(texts))
    ]


def load_transcript():
    """Transcribe the real audio once (cached to disk) into transcript lines."""
    if TRANSCRIPT_CACHE.exists():
        return json.loads(TRANSCRIPT_CACHE.read_text(encoding="utf-8"))

    segments = list(transcribe(client, TRANSCRIBE_MODEL, str(AUDIO_PATH)))
    speakers = diarize([text for _, text in segments])
    lines = [
        {"id": i, "t": int(start), "speaker": speaker, "text": text}
        for i, ((start, text), speaker) in enumerate(zip(segments, speakers), start=1)
    ]
    TRANSCRIPT_CACHE.parent.mkdir(parents=True, exist_ok=True)
    TRANSCRIPT_CACHE.write_text(json.dumps(lines, indent=2), encoding="utf-8")
    return lines


# Transcribe the audio at startup (uses the cache on subsequent reloads).
TRANSCRIPT = load_transcript()


def build_lines():
    """Attach deterministic rulebook tags to every transcribed line."""
    return [{**line, "tags": rulebook_tags(line["text"])} for line in TRANSCRIPT]



def collect_entities(lines):
    """Group every extracted tag by its semantic category for the sidebar."""
    entities = {category: [] for category in CATEGORY_COLORS}
    seen = set()
    for line in lines:
        for tag in line["tags"]:
            key = (tag["category"], tag["phrase"].lower())
            if key in seen:
                continue
            seen.add(key)
            entities[tag["category"]].append(
                {
                    "phrase": tag["phrase"],
                    "meaning": tag["meaning"],
                    "aave": tag.get("aave", False),
                    "type": tag.get("type"),
                    "line_id": line["id"],
                    "lat": tag.get("lat"),
                    "lng": tag.get("lng"),
                }
            )
    return entities


@app.get("/api/scenario")
def get_scenario():
    lines = build_lines()
    return {
        "id": SCENARIO["id"],
        "title": SCENARIO["title"],
        "center": SCENARIO["center"],
        "ems_units": SCENARIO["ems_units"],
        "colors": CATEGORY_COLORS,
        "lines": lines,
    }


@app.get("/api/export")
def export_log():
    lines = build_lines()
    return {
        "scenario": SCENARIO["title"],
        "transcript": [
            {"speaker": line["speaker"], "text": line["text"]} for line in lines
        ],
        "entities": collect_entities(lines),
    }


@app.post("/api/tag")
def tag_text(payload: dict):
    """Tag an arbitrary transcript line live with the AAVE dispatch tagger."""
    text = (payload or {}).get("text", "")
    if not text.strip():
        return {"text": text, "tags": []}

    return {"text": text, "tags": agent_tags(client, CHAT_MODEL, text)}


_REPORT_FIELDS = ("location", "patient", "caller_action", "hazards", "summary", "priority")


def generate_report(lines):
    """Have the agent extract a structured incident report from the transcript.

    `lines` is the portion of the call revealed so far, so the report fills in
    progressively as the call streams. Only states what the transcript supports.
    """
    empty = {k: "" for k in _REPORT_FIELDS}
    if not lines:
        return empty

    transcript = "\n".join(
        f'{line.get("speaker", "")}: {line.get("text", "")}' for line in lines
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You are a 911 dispatch assistant building a live incident "
                "report from a partial call transcript. Extract ONLY what the "
                "transcript supports — never invent details. Read AAVE / "
                "Southern dialect correctly (e.g. 'fell out' = collapsed/"
                "fainted, 'his sugar' = blood sugar / diabetic, 'finna' = about "
                "to). Return ONLY JSON of the form "
                '{"location": "", "patient": "", "caller_action": "", '
                '"hazards": "", "summary": "", "priority": ""}.\n'
                "Field guidance:\n"
                "- location: address or place of the emergency.\n"
                "- patient: chief complaint / patient condition (age, sex, "
                "symptoms, consciousness).\n"
                "- caller_action: what the caller is doing or has been "
                "instructed to do (e.g. CPR in progress).\n"
                "- hazards: scene hazards or safety concerns for responders.\n"
                "- summary: one tight sentence a dispatcher can read at a "
                "glance.\n"
                "- priority: exactly one of low|moderate|high|critical.\n"
                "Use an empty string for anything the transcript does not "
                "state. Keep every field short — a phrase, not a paragraph."
            ),
        },
        {"role": "user", "content": transcript},
    ]
    try:
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=messages,
        )
        data = json.loads(resp.choices[0].message.content)
    except (json.JSONDecodeError, AttributeError, TypeError, KeyError):
        return empty

    return {k: str(data.get(k, "") or "").strip() for k in _REPORT_FIELDS}


@app.post("/api/report")
def make_report(payload: dict):
    """Build a live structured incident report from the revealed transcript."""
    lines = (payload or {}).get("lines", [])
    return generate_report(lines)


@app.get("/api/audio")
def get_audio():
    """Serve the raw 911 audio clip for playback in the UI."""
    return FileResponse(str(AUDIO_PATH), media_type="audio/mpeg")


@app.get("/")
def root():
    return {"service": "aegis-dispatch", "scenario": "/api/scenario", "docs": "/docs"}
