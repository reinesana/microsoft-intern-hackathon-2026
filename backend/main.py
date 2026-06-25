"""
DESCRIPTION:
    Orchestrator for Aegis Dispatch. Streams a 911 transcript through the Azure
    OpenAI tagger one line at a time — flagging the words that sound off in
    terms of AAVE / Southern / regional dialect.

    The transcript is either the pre-loaded scenario (default) or the live
    transcript of an audio clip via OpenAI Whisper speech-to-text (--audio).

USAGE:
    python main.py                      # stream the canned scenario
    python main.py --audio call.mp3     # transcribe an audio clip, then stream

    Before running:

    pip install -r requirements.txt

    Required environment variables (loaded from `.env` via `python-dotenv`):
    1) OPENAI_API_KEY             - your OpenAI API key (sk-...).
    2) OPENAI_CHAT_MODEL          - chat model (defaults to `gpt-4o`).
    3) OPENAI_TRANSCRIBE_MODEL    - transcription model (only for --audio).
"""

import argparse

from dotenv import load_dotenv

from client import make_client, CHAT_MODEL, TRANSCRIBE_MODEL
from agent import tag_line
from scenario import SCENARIO
from speech import transcribe

load_dotenv()


def transcript_lines(client, audio_path):
    """Yield (label, text) transcript lines to stream through the tagger."""
    if audio_path:
        for start, text in transcribe(client, TRANSCRIBE_MODEL, audio_path):
            yield f"[{int(start // 60):02d}:{int(start % 60):02d}]", text
    else:
        for line in SCENARIO["lines"]:
            if line["speaker"].lower() == "caller":
                yield "caller>", line["text"]


def run(audio_path):
    client = make_client()
    print(f"Model: {CHAT_MODEL}")
    print("Streaming transcript through the AAVE dispatch tagger.\n")

    for label, text in transcript_lines(client, audio_path):
        print(f"{label} {text}")
        for tag in tag_line(client, CHAT_MODEL, text):
            flag = f"  [AAVE \u00b7 {tag['type']}]" if tag.get("aave") else ""
            print(f"    \u2022 {tag['phrase']} \u2192 {tag['meaning']}{flag}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stream a 911 transcript through the tagger.")
    parser.add_argument("--audio", help="path to an audio file to transcribe first")
    args = parser.parse_args()
    run(args.audio)
