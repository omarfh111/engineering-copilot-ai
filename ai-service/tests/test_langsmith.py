"""Optional live OpenAI/LangSmith connectivity check.

This check is deliberately disabled during the normal test suite because it
incurs a provider call and needs network access. Run it explicitly with
RUN_LIVE_INTEGRATION_TESTS=1.
"""

import os

import pytest


pytestmark = pytest.mark.integration


def test_langsmith_live_connection():
    if os.getenv("RUN_LIVE_INTEGRATION_TESTS") != "1":
        pytest.skip("Live OpenAI/LangSmith check disabled; set RUN_LIVE_INTEGRATION_TESTS=1 to run it.")

    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
    response = llm.invoke("Say only: LangSmith is working!")

    assert response.content.strip()
