"""Query rewriting and expansion utilities for the RAG retrieval stage."""

import re
from typing import List

from langchain_openai import ChatOpenAI

from app.core.logging import logger


class QueryTransformationService:
    """Uses a small LLM only when the optional retrieval enhancements are enabled."""

    def __init__(self, model_name: str, api_key: str):
        self.llm = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=0,
        )

    def rewrite(self, question: str) -> str:
        """Return a concise, standalone semantic-search version of *question*."""
        prompt = """Rewrite the following software-engineering question for semantic document retrieval.
Preserve its exact intent, names, versions, constraints and language. Do not answer it.
Return only one standalone rewritten question, with no label or explanation.

Question: {question}""".format(question=question)

        try:
            rewritten = self._content(self.llm.invoke(prompt))
            return rewritten or question
        except Exception as error:
            logger.warning("Query rewrite failed; using original question: %s", error)
            return question

    def expand(self, question: str, max_variants: int) -> List[str]:
        """Create complementary retrieval queries without changing the user's intent."""
        if max_variants <= 0:
            return []

        prompt = """Generate {max_variants} complementary semantic-search queries for the question below.
Keep the same intent and language. Cover useful synonyms, technical terms or alternate phrasings.
Do not answer the question. Return one query per line, with no numbering, labels or explanation.

Question: {question}""".format(max_variants=max_variants, question=question)

        try:
            content = self._content(self.llm.invoke(prompt))
            variants = []
            seen = {question.casefold()}
            for line in content.splitlines():
                candidate = re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", line).strip()
                key = candidate.casefold()
                if len(candidate) >= 3 and key not in seen:
                    variants.append(candidate)
                    seen.add(key)
                if len(variants) == max_variants:
                    break
            return variants
        except Exception as error:
            logger.warning("Query expansion failed; using available queries: %s", error)
            return []

    @staticmethod
    def _content(response) -> str:
        content = getattr(response, "content", response)
        if isinstance(content, list):
            content = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in content
            )
        return str(content).strip()
