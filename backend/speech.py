"""
DESCRIPTION:
    Speech-to-text via OpenAI Whisper (`whisper-1`), called with the OpenAI
    client.

    `transcribe` sends an audio file to the model and yields the recognized
    text split into sentence-sized lines, matching the (start, text) interface
    the rest of the app expects.

USAGE:
    from speech import transcribe
    from client import make_client, TRANSCRIBE_MODEL

    client = make_client()
    for start, text in transcribe(client, TRANSCRIBE_MODEL, "path/to/audio.mp3"):
        print(start, text)
"""

# Steers the transcription model toward a faithful, word-for-word transcript of
# dialect speech instead of normalizing it to standard English.
_VERBATIM_PROMPT = (
    "Verbatim transcript of a 911 emergency call between a Black caller and a "
    "dispatcher. Transcribe exactly what is said, word for word, preserving "
    "African American Vernacular English (AAVE), Southern, and regional "
    "dialect, grammar, and slang (e.g. 'finna', 'fell out', 'he been low'). Do "
    "not correct, standardize, paraphrase, or clean up the speaker's words."
)


def transcribe(client, model, audio_path):
    """Transcribe an audio file and yield (start_seconds, text) per segment."""
    with open(audio_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="verbose_json",
            prompt=_VERBATIM_PROMPT,
        )

    for segment in result.segments:
        text = segment.text.strip()
        if text:
            yield segment.start, text


