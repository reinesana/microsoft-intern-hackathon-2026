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

# Whisper's `prompt` biases vocabulary/spelling toward what it "expects" to
# hear. We feed it a short sample of dialect terms (NOT an instruction — long
# instructional prompts get echoed verbatim when a clip is quiet) so it spells
# AAVE / Southern speech faithfully instead of normalizing it.
_VERBATIM_PROMPT = (
    "finna, fixing to, fell out, he been low, his sugar, ain't breathin' right, "
    "come to, won't come to, naw, y'all, lemme, gimme"
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


