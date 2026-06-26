"""TrueVoice backend. Transcribes 911 audio with Whisper, streams the lines,
tags dialect live, builds a comparative incident report, and serves a map.

Run: uvicorn app:app --reload --port 8000
"""

import json
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from client import make_client, CHAT_MODEL, TRANSCRIBE_MODEL
from rulebook import CATEGORY_COLORS
from tagging import tag_line as rulebook_tags
from agent import tag_line as agent_tags
from speech import transcribe

load_dotenv()

app = FastAPI(title="TrueVoice API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Selectable demo calls; each transcript is cached to disk.
DEMOS = {
    "kenneth": {
        "id": "kenneth-walker",
        "title": "Live 911 Call — Shooting Reported",
        "audio": Path("audio_callls/audio_kennethwalker.mp3"),
        "cache": Path("data/transcript_kenneth.json"),
        "media_type": "audio/mpeg",
        "center": {"lat": 38.2527, "lng": -85.7585},
        "ems_units": [
            {"id": "MEDIC-3", "lat": 38.2610, "lng": -85.7650, "status": "Available"},
            {"id": "ENGINE-7", "lat": 38.2450, "lng": -85.7500, "status": "Available"},
        ],
    },
    "wav2": {
        "id": "covert-domestic",
        "title": "Disguised Call — Caller May Not Be Able to Speak Freely",
        "audio": Path("audio_callls/audio_wav2.mp4"),
        "cache": Path("data/transcript.json"),
        "media_type": "audio/mp4",
        "center": {"lat": 33.749, "lng": -84.388},
        "ems_units": [
            {"id": "MEDIC-7", "lat": 33.7705, "lng": -84.3960, "status": "Available"},
            {"id": "ENGINE-12", "lat": 33.7520, "lng": -84.3750, "status": "Available"},
        ],
    },
}
DEFAULT_DEMO = "kenneth"


def _demo(key):
    return DEMOS.get(key, DEMOS[DEFAULT_DEMO])


client = make_client()


def diarize(texts):
    """Label each transcript line as Dispatcher or Caller."""
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
        try:
            resp = client.chat.completions.create(
                model=CHAT_MODEL,
                temperature=temperature,
                response_format={"type": "json_object"},
                messages=messages,
            )
            return json.loads(resp.choices[0].message.content).get("speakers", [])
        except Exception:  # noqa: BLE001
            return []

    speakers = _ask(0)
    # Retry if the model collapsed every line to the same label.
    if len(set(speakers[: len(texts)])) < 2:
        speakers = _ask(0.4)

    return [
        speakers[i] if i < len(speakers) and speakers[i] in ("Dispatcher", "Caller") else "Caller"
        for i in range(len(texts))
    ]


def load_transcript(demo):
    """Transcribe a demo's audio into lines, cached to disk. Returns [] on failure
    so startup never crashes when the API is unavailable."""
    cache = demo["cache"]
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))

    try:
        segments = list(transcribe(client, TRANSCRIBE_MODEL, str(demo["audio"])))
        speakers = diarize([text for _, text in segments])
        lines = [
            {"id": i, "t": int(start), "speaker": speaker, "text": text}
            for i, ((start, text), speaker) in enumerate(zip(segments, speakers), start=1)
        ]
    except Exception:  # noqa: BLE001
        return []

    if lines:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(lines, indent=2), encoding="utf-8")
    return lines


TRANSCRIPTS = {key: load_transcript(cfg) for key, cfg in DEMOS.items()}


def build_lines(demo_key):
    """Attach rulebook tags to every transcribed line."""
    return [
        {**line, "tags": rulebook_tags(line["text"])}
        for line in TRANSCRIPTS.get(demo_key, [])
    ]


def collect_entities(lines):
    """Group every tag by category, de-duplicated."""
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
def get_scenario(demo: str = DEFAULT_DEMO):
    key = demo if demo in DEMOS else DEFAULT_DEMO
    cfg = _demo(key)
    lines = build_lines(key)
    return {
        "id": cfg["id"],
        "title": cfg["title"],
        "center": cfg["center"],
        "ems_units": cfg["ems_units"],
        "colors": CATEGORY_COLORS,
        "lines": lines,
        "demo": key,
        "demos": [{"key": k, "title": v["title"]} for k, v in DEMOS.items()],
    }


@app.get("/api/export")
def export_log(demo: str = DEFAULT_DEMO):
    key = demo if demo in DEMOS else DEFAULT_DEMO
    cfg = _demo(key)
    lines = build_lines(key)
    return {
        "scenario": cfg["title"],
        "transcript": [
            {"speaker": line["speaker"], "text": line["text"]} for line in lines
        ],
        "entities": collect_entities(lines),
    }


@app.post("/api/tag")
def tag_text(payload: dict):
    """Tag one transcript line with the live dialect agent."""
    text = (payload or {}).get("text", "")
    if not text.strip():
        return {"text": text, "tags": []}

    return {"text": text, "tags": agent_tags(client, CHAT_MODEL, text)}


_AGENT_FIELDS = ("location", "patient", "caller_action", "hazards", "summary", "priority")


def _clean_section(data, key):
    section = data.get(key) if isinstance(data, dict) else None
    if not isinstance(section, dict):
        section = {}
    return {k: str(section.get(k, "") or "").strip() for k in _AGENT_FIELDS}


def generate_report(lines):
    """Build two incident reports from the same transcript and compare them:
    `agent` reads dialect correctly, `naive` is a standard-English reading.
    `corrections` lists the dialect phrases the naive reading would misread.
    """
    empty = {
        "agent": {k: "" for k in _AGENT_FIELDS},
        "naive": {k: "" for k in _AGENT_FIELDS},
        "corrections": [],
        "severity": "",
        "under_triage": "",
    }
    if not lines:
        return empty

    transcript = "\n".join(
        f'{line.get("speaker", "")}: {line.get("text", "")}' for line in lines
    )
    messages = [
        {
            "role": "system",
            "content": (
                "You analyze a partial 911 call transcript two different ways "
                "and output a comparison a dispatcher can act on. Extract ONLY "
                "what the transcript supports — never invent details.\n"
                "Return ONLY JSON of the form:\n"
                '{"agent": {"location": "", "patient": "", "caller_action": "", '
                '"hazards": "", "summary": "", "priority": ""}, '
                '"naive": {"location": "", "patient": "", "caller_action": "", '
                '"hazards": "", "summary": "", "priority": ""}, '
                '"corrections": [{"phrase": "", "misread": "", "actual": ""}], '
                '"severity": "", "under_triage": ""}.\n'
                "\n"
                "'agent' = the report from a dispatcher who FULLY understands "
                "African American Vernacular English (AAVE) and Southern / "
                "regional dialect. Read dialect correctly (e.g. 'fell out' = "
                "collapsed / fainted, 'his sugar' = blood sugar / diabetic "
                "emergency, 'finna' = about to, habitual 'be', \"can't come "
                "to\" = will not regain consciousness). Extract accurate, "
                "complete details and set the correct priority.\n"
                "\n"
                "'naive' = the report a standard-English dispatcher with NO "
                "dialect training would produce from the SAME words. They take "
                "dialect literally or miss it entirely: they may not realize "
                "'fell out' means collapsed, may miss the medical emergency, "
                "and may under-prioritize or leave fields vague / blank. Be "
                "realistic about what they would genuinely misunderstand.\n"
                "\n"
                "'corrections' = every AAVE / dialect phrase in the transcript "
                "the naive dispatcher would misread. 'misread' = the wrong or "
                "literal interpretation; 'actual' = the correct meaning. Only "
                "include genuine dialect items actually present in the "
                "transcript.\n"
                "\n"
                "'severity' = a short label for how serious this really is "
                "(e.g. 'Life-threatening - possible cardiac / diabetic', "
                "'Non-urgent').\n"
                "\n"
                "'under_triage' = a short note on what about THIS specific call "
                "could cause a dispatcher or an AI to WRONGLY give it a lower "
                "priority than it deserves - e.g. the caller sounds calm or "
                "matter-of-fact, the emergency is phrased indirectly or "
                "disguised, dialect could be misheard as non-urgent, or there "
                "are no obvious alarm keywords. Empty string if nothing would "
                "cause under-prioritization.\n"
                "\n"
                "priority for BOTH reports: exactly one of "
                "low|moderate|high|critical. Use an empty string for anything "
                "the transcript does not support. Keep every field short — a "
                "phrase, not a paragraph."
            ),
        },
        {"role": "user", "content": transcript},
    ]
    data = None
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=CHAT_MODEL,
                temperature=0,
                response_format={"type": "json_object"},
                messages=messages,
            )
            data = json.loads(resp.choices[0].message.content)
            break
        except Exception:  # noqa: BLE001
            if attempt == 2:
                return empty
            time.sleep(1.5 * (attempt + 1))

    corrections = []
    for item in (data.get("corrections") or [])[:8]:
        if not isinstance(item, dict):
            continue
        phrase = str(item.get("phrase", "") or "").strip()
        if not phrase:
            continue
        corrections.append(
            {
                "phrase": phrase,
                "misread": str(item.get("misread", "") or "").strip(),
                "actual": str(item.get("actual", "") or "").strip(),
            }
        )

    return {
        "agent": _clean_section(data, "agent"),
        "naive": _clean_section(data, "naive"),
        "corrections": corrections,
        "severity": str(data.get("severity", "") or "").strip(),
        "under_triage": str(data.get("under_triage", "") or "").strip(),
    }


@app.post("/api/report")
def make_report(payload: dict):
    lines = (payload or {}).get("lines", [])
    return generate_report(lines)


@app.get("/api/audio/{demo}")
def get_audio(demo: str):
    """Serve a demo's audio clip (path-based to avoid stale browser caching)."""
    cfg = _demo(demo)
    return FileResponse(str(cfg["audio"]), media_type=cfg["media_type"])


@app.get("/")
def root():
    return {"service": "truevoice", "scenario": "/api/scenario", "docs": "/docs"}
