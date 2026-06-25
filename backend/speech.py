"""
DESCRIPTION:
    Speech-to-text via the OpenAI Whisper API.

    `transcribe` sends an audio file to Whisper and yields each recognized
    segment with its start time, matching the (offset_seconds, text) interface
    the rest of the app expects.

USAGE:
    from speech import transcribe

    for offset_seconds, text in transcribe("path/to/audio.wav"):
        print(offset_seconds, text)

    Requires OPENAI_API_KEY in the environment (loaded from .env by the caller).
"""

import os

from openai import OpenAI


def transcribe(audio_path):
    """Transcribe an audio file with Whisper.

    Yields (offset_seconds, text) for each segment Whisper returns.
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    with open(audio_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model=os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1"),
            file=audio_file,
            response_format="verbose_json",
        )

    for segment in result.segments:
        yield segment.start, segment.text.strip()

