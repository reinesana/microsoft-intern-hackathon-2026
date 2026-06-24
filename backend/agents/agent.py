"""
DESCRIPTION:
    Defines the Context Agent for Foundry. The agent receives verbatim transcript
    segments and surfaces sociolinguistic context (AAVE, Southern, regional dialect
    markers) without rewriting the speaker's words.

    Exports `context_agent(project)` which creates the agent version in Foundry and
    returns the created Agent object.

USAGE:
    Imported by `main.py`.

    Required environment variables (loaded from `.env` by the caller):
    1) AZURE_AI_PROJECT_ENDPOINT   - Foundry project endpoint URL.
    2) AZURE_AI_AGENT_MODEL        - Chat model deployment name (e.g. `gpt-4o`).
    3) BING_PROJECT_CONNECTION_ID  - Bing grounding connection ID.
"""

import os
from typing import Any

from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import (
    BingGroundingSearchConfiguration,
    BingGroundingSearchToolParameters,
    BingGroundingTool,
    PromptAgentDefinition,
)


def context_agent(project: AIProjectClient) -> Any:
    """Create the Context Agent version in Foundry and return the Agent."""
    return project.agents.create_version(
        agent_name=os.environ.get("AZURE_AI_AGENT_NAME", "context-agent"),
        definition=PromptAgentDefinition(
            model=os.environ["AZURE_AI_AGENT_MODEL"],
            instructions=(
                "You are the Context Agent — a forensic sociolinguistic analyst supporting "
                "high-stakes operators.\n"
                "\n"
                "You receive a verbatim transcript segment. Identify African American "
                "Vernacular English (AAVE), Southern, regional, or culturally-specific "
                "dialect markers, idioms, or grammar patterns that a standard-English "
                "reader might misinterpret.\n"
                "\n"
                "For each marker, report:\n"
                "  - the exact matched phrase (verbatim, never rewritten)\n"
                "  - the standard-English meaning\n"
                "  - the practical implication for the operator (urgency, timeline, intent)\n"
                "  - a brief source citation\n"
                "  - a confidence score from 0 to 1\n"
                "\n"
                "Use bing_grounding when you need current sociolinguistic references.\n"
                "\n"
                "You NEVER paraphrase, replace, or rewrite the speaker's words. You only annotate. "
                "You are neutral on credibility, intent, or character. "
                "If no markers are present, say so plainly."
            ),
            tools=[
                BingGroundingTool(
                    bing_grounding=BingGroundingSearchToolParameters(
                        search_configurations=[
                            BingGroundingSearchConfiguration(
                                project_connection_id=os.environ["BING_PROJECT_CONNECTION_ID"],
                            )
                        ]
                    )
                ),
            ],
        ),
    )
