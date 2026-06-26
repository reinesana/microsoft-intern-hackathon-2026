"""Speech-to-text via OpenAI Whisper. `transcribe` yields (start_seconds, text)
per segment.
"""

# Whisper's `prompt` biases spelling toward what it expects to hear. A short
# sample of dialect terms (not an instruction — long instructions get echoed
# back) keeps AAVE / Southern speech spelled faithfully instead of normalized.
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


