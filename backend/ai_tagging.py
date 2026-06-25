"""
DESCRIPTION:
    OpenAI-powered tagging for live transcript lines. Same output shape as
    `tagging.tag_line`, so the frontend can render the pill-badges identically.

    The model returns interpretive phrases; we locate each phrase in the
    original text to compute char offsets (never rewriting the words) and
    attach known coordinates for address tags.

USAGE:
    from ai_tagging import ai_tag_line
    tags = ai_tag_line(client, "he fell out and ain't right")
"""

import json
import os

from rulebook import ADDRESSES
from tagging import CATEGORY_COLORS

INSTRUCTIONS = (
    "You are a 911 dispatch language analyst. Given one verbatim transcript line, "
    "find phrases that carry dispatch-critical meaning and classify each into one of "
    "these categories:\n"
    "  - location: an address or place the caller refers to\n"
    "  - medical: a symptom, condition, or medical event (incl. dialect/idiom)\n"
    "  - intent: an action the caller is taking or about to take\n"
    "  - vehicle: a vehicle description\n"
    "\n"
    "Rules:\n"
    "  - Use the EXACT substring from the line as the phrase. Never rewrite words.\n"
    "  - Give a short plain-English meaning for each phrase.\n"
    "  - Set \"aave\": true if the phrase is an AAVE / Southern / regional dialect "
    "marker a standard-English reader might misread, else false.\n"
    "  - When aave is true, set \"type\" to the linguistic feature "
    "(e.g. \"Idiom\", \"Vocabulary\", \"Negation\", \"Grammar\"); otherwise null.\n"
    "  - Only tag phrases that genuinely matter to a dispatcher.\n"
    "\n"
    'Respond ONLY as JSON: {"tags": [{"phrase": "...", "category": "...", '
    '"meaning": "...", "aave": true, "type": "..."}]}'
)


def ai_tag_line(client, text):
    """Return interpretive tags for `text` using OpenAI, with char offsets."""
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": INSTRUCTIONS},
            {"role": "user", "content": text},
        ],
    )

    data = json.loads(response.choices[0].message.content)
    lowered = text.lower()
    tags = []

    for item in data.get("tags", []):
        phrase = item.get("phrase", "")
        category = item.get("category", "")
        if not phrase or category not in CATEGORY_COLORS:
            continue

        start = lowered.find(phrase.lower())
        if start == -1:
            continue
        end = start + len(phrase)

        tag = {
            "phrase": text[start:end],
            "category": category,
            "meaning": item.get("meaning", ""),
            "aave": bool(item.get("aave", False)),
            "type": item.get("type"),
            "start": start,
            "end": end,
        }

        coords = ADDRESSES.get(text[start:end].lower())
        if coords:
            tag["lat"] = coords["lat"]
            tag["lng"] = coords["lng"]
            tag["label"] = coords["label"]
            tag["meaning"] = "Caller location — " + coords["label"]

        tags.append(tag)

    tags.sort(key=lambda tag: tag["start"])
    return tags
