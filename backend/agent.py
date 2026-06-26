"""Dialect tagger. Reads one verbatim 911 transcript line and flags AAVE /
Southern / regional phrasing a standard-English dispatcher could misread,
without ever rewriting the caller's words.
"""

import json
import time

from rulebook import ADDRESSES

INSTRUCTIONS = (
    "You are a 911 dispatch interpreter for African American Vernacular "
    "English (AAVE) and Southern / regional dialect. Read ONE verbatim line "
    "from a live 911 call and flag only the words or phrases a standard-English "
    "dispatcher could misread because of dialect (e.g. 'fell out' = collapsed / "
    "fainted, 'come to' = regain consciousness, 'finna' = about to, habitual "
    "'be', stressed 'BIN' = a long time, 'ain't got no' = doesn't have any, "
    "'his sugar' = blood sugar / diabetic). Never rewrite or correct the "
    "caller.\n"
    "Return ONLY JSON, no prose: "
    '{"tags": [{"phrase": "<verbatim substring from the line>", '
    '"category": "location|medical|intent|vehicle", '
    '"meaning": "<short plain-English gloss, under 8 words>", '
    '"aave": true|false, "type": "<linguistic feature or null>"}]}.\n'
    "`phrase` MUST be copied verbatim from the line. Set `aave` true only for "
    "genuine dialect markers that could be misread. If nothing is worth "
    'flagging, return {"tags": []}. Never invent phrases not in the line.'
)



def _parse_tags(raw):
    """Defensively pull the tags list out of the model's text response."""
    if not raw:
        return []
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):] if "{" in text else text
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return []
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    tags = data.get("tags", []) if isinstance(data, dict) else []
    return tags if isinstance(tags, list) else []


def _chat_json(client, model, system, user, retries=3):
    """Call the chat model with retry; return raw content, or None on failure."""
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            return response.choices[0].message.content
        except Exception:  # noqa: BLE001
            if attempt == retries - 1:
                return None
            time.sleep(1.2 * (attempt + 1))
    return None


def tag_line(client, model, text):
    """Run one transcript line through the model and return located tags."""
    if not text or not text.strip():
        return []

    raw = _chat_json(client, model, INSTRUCTIONS, text)
    if raw is None:
        return []

    tags = []
    lowered = text.lower()
    for tag in _parse_tags(raw):
        phrase = tag.get("phrase", "")
        if not phrase:
            continue
        start = lowered.find(phrase.lower())
        if start == -1:
            continue
        located = {
            "phrase": text[start : start + len(phrase)],
            "category": tag.get("category", "intent"),
            "meaning": tag.get("meaning", ""),
            "aave": bool(tag.get("aave", False)),
            "type": tag.get("type"),
            "start": start,
            "end": start + len(phrase),
        }
        coords = ADDRESSES.get(phrase.lower())
        if coords:
            located["lat"] = coords["lat"]
            located["lng"] = coords["lng"]
            located["label"] = coords["label"]
        tags.append(located)

    tags.sort(key=lambda item: item["start"])
    return tags
