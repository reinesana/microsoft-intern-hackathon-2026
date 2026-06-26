"""Deterministic, non-destructive tagging. `tag_line` returns rulebook phrases
and extracted addresses with character offsets, never altering the text.
"""

import re

from rulebook import ADDRESSES, RULEBOOK

# Matches things like "1420 Pine Street" or "55 Oak Ave".
_ADDRESS_RE = re.compile(
    r"\b\d{1,5}\s+[A-Z][a-zA-Z]+"
    r"(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Way))\b"
)


def find_phrase_tags(text):
    """Return rulebook tags found in `text` (case-insensitive, verbatim phrase)."""
    tags = []
    lowered = text.lower()
    for phrase, info in RULEBOOK.items():
        start = lowered.find(phrase)
        if start == -1:
            continue
        end = start + len(phrase)
        tags.append(
            {
                "phrase": text[start:end],
                "category": info["category"],
                "meaning": info["meaning"],
                "aave": info.get("aave", False),
                "type": info.get("type"),
                "start": start,
                "end": end,
            }
        )
    return tags


def find_address_tags(text):
    """Return address tags found in `text`, with coordinates when known."""
    tags = []
    for match in _ADDRESS_RE.finditer(text):
        phrase = match.group(0)
        tag = {
            "phrase": phrase,
            "category": "location",
            "meaning": "Extracted address",
            "aave": False,
            "type": None,
            "start": match.start(),
            "end": match.end(),
        }
        coords = ADDRESSES.get(phrase.lower())
        if coords:
            tag["lat"] = coords["lat"]
            tag["lng"] = coords["lng"]
            tag["label"] = coords["label"]
            tag["meaning"] = "Caller location — " + coords["label"]
        tags.append(tag)
    return tags


def tag_line(text):
    """Return all tags in a line, ordered by their position in the text."""
    tags = find_phrase_tags(text) + find_address_tags(text)
    tags.sort(key=lambda tag: tag["start"])
    return tags
