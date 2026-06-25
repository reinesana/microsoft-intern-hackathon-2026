import argparse
import os

from openai import OpenAI
from dotenv import load_dotenv

from agents.agent import analyze
from speech import transcribe

load_dotenv()


def run(audio_path):
    print(f"audio: {audio_path}")
    print("transcribing via OpenAI Whisper...\n")

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    for offset, text in transcribe(audio_path):
        minutes = int(offset // 60)
        seconds = int(offset % 60)
        print(f"[{minutes:02d}:{seconds:02d}] VERBATIM: {text}")
        print(f"ANALYSIS:\n{analyze(client, text)}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True, help="path to an audio file")
    args = parser.parse_args()
    run(args.audio)
