"""
DESCRIPTION:
    Live speech-to-text via Azure AI Speech.

    `transcribe` runs continuous recognition on a WAV file and yields each
    recognized segment as it arrives.

USAGE:
    from speech import transcribe

    for offset_seconds, text in transcribe("path/to/audio.wav"):
        print(offset_seconds, text)
"""

import os
import queue
import threading

import azure.cognitiveservices.speech as speechsdk


def transcribe(audio_path):
    """Transcribe a WAV file with Azure AI Speech (continuous mode).

    Yields (offset_seconds, text) for each recognized utterance as it arrives.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=os.getenv("AZURE_SPEECH_KEY"),
        region=os.getenv("AZURE_SPEECH_REGION"),
    )

    audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
    )

    segment_queue: queue.Queue = queue.Queue()
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.text:
            offset_seconds = evt.result.offset / 10_000_000
            segment_queue.put((offset_seconds, evt.result.text))

    def on_stopped(evt):
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.session_stopped.connect(on_stopped)
    recognizer.canceled.connect(on_stopped)

    recognizer.start_continuous_recognition()

    while not done.is_set():
        try:
            yield segment_queue.get(timeout=0.1)
        except queue.Empty:
            continue

    while not segment_queue.empty():
        yield segment_queue.get()

    recognizer.stop_continuous_recognition()
