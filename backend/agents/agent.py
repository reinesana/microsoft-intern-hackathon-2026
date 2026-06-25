"""
DESCRIPTION:
    The Context Agent — a forensic sociolinguistic analyst. It receives verbatim
    transcript segments and surfaces dialect markers (AAVE, Southern, regional)
    without rewriting the speaker's words, using the OpenAI chat API.

    Exports `analyze(client, text)` which returns the analysis string.

USAGE:
    Imported by `main.py`.

    Required environment variables (loaded from `.env` by the caller):
    1) OPENAI_API_KEY   - OpenAI API key.
    2) OPENAI_MODEL     - Chat model name (e.g. `gpt-4o`). Defaults to `gpt-4o`.
"""

import os

INSTRUCTIONS = (
    "You are the Context Agent — a forensic sociolinguistic analyst supporting "
    "high-stakes operators.\n"
    "\n"
    "You receive a verbatim transcript segment. Identify African American "
    "Vernacular English (AAVE), Southern, regional, or culturally-specific "
    "dialect markers, idioms, or grammar patterns that a standard-English "
    "reader might misinterpret.\n"
    "\n"
    "For each marker, report:\n"
    "  - the exact matched phrase (verbatim, never rewritten)\n"
    "  - the standard-English meaning\n"
    "  - the practical implication for the operator (urgency, timeline, intent)\n"
    "  - a confidence score from 0 to 1\n"
    "\n"
    "You NEVER paraphrase, replace, or rewrite the speaker's words. You only annotate. "
    "You are neutral on credibility, intent, or character. "
    "If no markers are present, say so plainly."
)


def analyze(client, text):
    """Analyze one verbatim transcript segment and return the annotation text."""
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        messages=[
            {"role": "system", "content": INSTRUCTIONS},
            {"role": "user", "content": text},
        ],
    )
    return response.choices[0].message.content
