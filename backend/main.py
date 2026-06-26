"""Standalone CLI: stream a 911 transcript (canned scenario or an audio file)
through the dialect tagger and print the tags.

    python main.py                   # canned scenario
    python main.py --audio call.mp3  # transcribe an audio clip, then stream
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
