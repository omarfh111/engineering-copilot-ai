"""Check configured provider connectivity without exposing secrets.

Run from the ai-service directory:
    python scripts/check_provider_health.py
"""

import os
import sys
from dataclasses import dataclass
from typing import Callable, Optional

import requests
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient


load_dotenv(".env")


@dataclass(frozen=True)
class ProviderCheck:
    name: str
    required_for_sprint3: bool
    check: Optional[Callable[[], None]] = None
    required_environment_variables: tuple[str, ...] = ()


def value_is_configured(name: str) -> bool:
    value = os.getenv(name, "").strip()
    return bool(value) and not value.lower().startswith(
        ("change", "replace", "your_", "example", "todo")
    )


def check_openai() -> None:
    OpenAI(timeout=12, max_retries=0).models.list()


def check_qdrant() -> None:
    QdrantClient(
        url=os.environ["QDRANT_URL"],
        api_key=os.getenv("QDRANT_API_KEY") or None,
        timeout=12,
    ).get_collections()


def check_github() -> None:
    response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
            "Accept": "application/vnd.github+json",
        },
        timeout=12,
    )
    response.raise_for_status()


def check_huggingface() -> None:
    response = requests.get(
        "https://huggingface.co/api/whoami-v2",
        headers={"Authorization": f"Bearer {os.environ['HUGGINGFACE_API_KEY']}"},
        timeout=12,
    )
    response.raise_for_status()


def check_langsmith() -> None:
    endpoint = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
    response = requests.get(
        f"{endpoint.rstrip('/')}/info",
        headers={"x-api-key": os.environ["LANGCHAIN_API_KEY"]},
        timeout=12,
    )
    response.raise_for_status()


CHECKS = (
    ProviderCheck("OpenAI", True, check_openai, ("OPENAI_API_KEY",)),
    ProviderCheck("Qdrant", True, check_qdrant, ("QDRANT_URL",)),
    ProviderCheck("GitHub", True, check_github, ("GITHUB_TOKEN",)),
    ProviderCheck("Hugging Face", False, check_huggingface, ("HUGGINGFACE_API_KEY",)),
    ProviderCheck("LangSmith", False, check_langsmith, ("LANGCHAIN_API_KEY",)),
    ProviderCheck("SAE <-> IA internal key", True, None, ("AI_INTERNAL_API_KEY",)),
)


def main() -> int:
    critical_failure = False

    for provider in CHECKS:
        missing = [
            variable
            for variable in provider.required_environment_variables
            if not value_is_configured(variable)
        ]
        if missing:
            print(f"{provider.name}: NOT_CONFIGURED")
            critical_failure |= provider.required_for_sprint3
            continue

        if provider.check is None:
            print(f"{provider.name}: CONFIGURED")
            continue

        try:
            provider.check()
            print(f"{provider.name}: AVAILABLE")
        except Exception as error:
            # Deliberately expose only an error class, never request headers or keys.
            print(f"{provider.name}: UNAVAILABLE ({type(error).__name__})")
            critical_failure |= provider.required_for_sprint3

    return 1 if critical_failure else 0


if __name__ == "__main__":
    sys.exit(main())
