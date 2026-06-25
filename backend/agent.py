"""
DESCRIPTION:
    The Aegis Dispatch tagger. Reads one verbatim 911 transcript line, flags the
    words that sound off in terms of AAVE / Southern / regional dialect, and
    returns interpretive tags the UI overlays. It never rewrites the caller's
    words.

    Runs as a direct Azure OpenAI chat completion (key auth) — no Foundry agent
    data plane required, so it works with a plain Contributor role.

USAGE:
    from agent import tag_line
    from client import make_client, CHAT_MODEL

    client = make_client()
    tags = tag_line(client, CHAT_MODEL, "he fell out and ain't right")
"""

import json

from rulebook import ADDRESSES

INSTRUCTIONS = (
    "You are Aegis, a 911 dispatch interpreter who specializes in "
    "African American Vernacular English (AAVE) and Southern / regional "
    "dialect. You read ONE verbatim line from a live 911 call and surface the "
    "words or phrases a standard-English dispatcher could misread, "
    "misunderstand, or dismiss because of dialect. You NEVER rewrite, correct, "
    "or standardize the caller — you only annotate so the dispatcher "
    "understands exactly what was meant.\n"
    "\n"
    "## Priorities\n"
    "1. AAVE / dialect FIRST. Flag idioms, grammar, and vocabulary whose "
    "meaning differs from how a standard-English listener would hear them — "
    "e.g. 'fell out' (collapsed/fainted), 'come to' (regain consciousness), "
    "'finna' (about to), habitual 'be', stressed 'BIN' (a long time ago / for "
    "a long time), negative concord ('ain't got no'), 'his sugar' (blood "
    "sugar / diabetic).\n"
    "2. THEN operational details that drive the response: medical state, "
    "location, intent/action, vehicle/suspect.\n"
    "\n"
    "## `meaning` must DESCRIBE and give CONTEXT\n"
    "For every flag, write `meaning` in plain English that does two things a "
    "dispatcher can act on under pressure:\n"
    "- Translate: what the phrase actually means here.\n"
    "- Context: why it matters — the medical urgency it implies, or how a "
    "standard-English listener could misinterpret it (and what the real "
    "meaning is). One or two tight sentences.\n"
    "\n"
    "## Output format (STRICT)\n"
    "Return ONLY a JSON object, no prose, no markdown fences:\n"
    '{"tags": [{"phrase": "<verbatim substring from the line>", '
    '"category": "location|medical|intent|vehicle", '
    '"meaning": "<translation + why it matters to the dispatcher>", '
    '"aave": true|false, '
    '"type": "<linguistic feature, e.g. Idiom / Stressed BIN / Negation> or null"}]}\n'
    "\n"
    "## Hard rules\n"
    "- `phrase` MUST be copied verbatim from the line (same casing/spelling) "
    "so it can be located in the original text.\n"
    "- Set `aave` true only when the phrase is a dialect marker that could be "
    "misread, and name the feature in `type`; otherwise false with `type` "
    "null.\n"
    '- If nothing is worth flagging, return {"tags": []}.\n'
    "- Never invent phrases that are not in the line."
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


def tag_line(client, model, text):
    """Run one transcript line through the model and return located tags."""
    if not text or not text.strip():
        return []

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": INSTRUCTIONS},
            {"role": "user", "content": text},
        ],
    )
    raw = response.choices[0].message.content

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
