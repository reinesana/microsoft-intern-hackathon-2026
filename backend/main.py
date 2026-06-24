import argparse
import os

from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv
from agents.agent import context_agent
from speech import transcribe

load_dotenv()


def run(audio_path):
    print(f"audio: {audio_path}")
    print("live transcribing via Azure AI Speech...\n")

    with AIProjectClient(
        endpoint=os.getenv("AZURE_AI_PROJECT_ENDPOINT"),
        credential=DefaultAzureCredential(),
    ) as project:
        agent = context_agent(project)

        with project.get_openai_client() as openai_client:
            conversation = openai_client.conversations.create(items=[])

            for offset, text in transcribe(audio_path):
                minutes = int(offset // 60)
                seconds = int(offset % 60)
                print(f"[{minutes:02d}:{seconds:02d}] VERBATIM: {text}")

                openai_client.conversations.items.create(
                    conversation_id=conversation.id,
                    items=[
                        {
                            "type": "message",
                            "role": "user",
                            "content": text,
                        }
                    ],
                )

                response = openai_client.responses.create(
                    conversation=conversation.id,
                    extra_body={
                        "agent_reference": {
                            "name": agent.name,
                            "type": "agent_reference",
                        }
                    },
                )

                print(f"ANALYSIS:\n{response.output_text}\n")

            openai_client.conversations.delete(conversation_id=conversation.id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True, help="path to a WAV file")
    args = parser.parse_args()
    run(args.audio)
