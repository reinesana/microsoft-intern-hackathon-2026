"""Shared OpenAI client. Reads the API key and model names from the environment.

Required env (from .env): OPENAI_API_KEY, optional OPENAI_CHAT_MODEL,
OPENAI_TRANSCRIBE_MODEL.
"""

import os

from openai import OpenAI

CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o")
TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")


def make_client():
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])
