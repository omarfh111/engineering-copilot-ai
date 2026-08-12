"""Category routing for optional hierarchical RAG retrieval."""

from typing import List

from langchain_openai import ChatOpenAI

from app.core.logging import logger


SUPPORTED_CATEGORIES = (
    "architecture",
    "coding_standards",
    "framework_docs",
    "security",
)


class QueryRoutingService:
    """Routes a question to corpus categories, falling back safely to global search."""

    def __init__(self, model_name: str, api_key: str):
        self.llm = ChatOpenAI(model=model_name, api_key=api_key, temperature=0)

    def route(self, question: str) -> List[str]:
        prompt = """Classify this software-engineering question for document retrieval.
Available categories: architecture, coding_standards, framework_docs, security.
Return one or more category names separated by commas. Return ALL for a broad,
cross-category or ambiguous question. Do not explain your decision.

Question: {question}""".format(question=question)
        try:
            response = self.llm.invoke(prompt)
            content = str(getattr(response, "content", response)).casefold()
            if "all" in content:
                return []
            categories = [
                category
                for category in SUPPORTED_CATEGORIES
                if category in content
            ]
            return categories
        except Exception as error:
            logger.warning("Hierarchical query routing failed; using global search: %s", error)
            return []
