"""
DESCRIPTION:
    Shared OpenAI client for Aegis Dispatch. Uses the standard OpenAI API
    (api.openai.com) with an API key — no Azure RBAC or deployments needed.

USAGE:
    from client import make_client, CHAT_MODEL, TRANSCRIBE_MODEL

    client = make_client()
    client.chat.completions.create(model=CHAT_MODEL, ...)

    Required environment variables (loaded from `.env` by the caller):
    1) OPENAI_API_KEY          - your OpenAI API key (sk-...).
    2) OPENAI_CHAT_MODEL       - chat model (defaults to `gpt-4o`).
    3) OPENAI_TRANSCRIBE_MODEL - transcription model (defaults to `whisper-1`).
"""

import os

from openai import OpenAI

CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o")
TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")


def make_client():
    """Build an OpenAI client using the API key from the environment."""
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])
