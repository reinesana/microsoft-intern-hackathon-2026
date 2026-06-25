"""
DESCRIPTION:
    FastAPI middleware for Aegis Dispatch. Serves the pre-loaded 911 scenario
    with interpretive tags applied to each line, and exports a clean dispatch
    log for the dispatcher.

    Kept deliberately simple: plain functions, plain dicts, no classes.

USAGE:
    uvicorn app:app --reload --port 8000

    Endpoints:
        GET  /api/scenario   scenario + tagged transcript lines + EMS units
        GET  /api/export     downloadable dispatch log (tags grouped by entity)
        POST /api/tag        live OpenAI tagging for an arbitrary transcript line
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

from scenario import SCENARIO
from tagging import CATEGORY_COLORS, tag_line
from ai_tagging import ai_tag_line

load_dotenv()

app = FastAPI(title="Aegis Dispatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_lines():
    """Attach interpretive tags to every line in the scenario."""
    lines = []
    for line in SCENARIO["lines"]:
        lines.append({**line, "tags": tag_line(line["text"])})
    return lines


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
    """Tag an arbitrary transcript line live with OpenAI."""
    text = (payload or {}).get("text", "")
    if not text.strip():
        return {"text": text, "tags": []}

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return {"text": text, "tags": ai_tag_line(client, text)}


@app.get("/")
def root():
    return {"service": "aegis-dispatch", "scenario": "/api/scenario", "docs": "/docs"}
