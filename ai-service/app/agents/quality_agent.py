"""Deterministic code-quality checks for the Sprint 3 MVP."""

import re

from app.agents.base import BaseAgent
from app.schemas.agents import (
    AgentFinding,
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingLocation,
    FindingSeverity,
    FindingSource,
)
from app.services.github_service import GitHubRepositoryService


class QualityAgent(BaseAgent):
    """Reports small, reproducible maintainability signals without changing code."""

    name = AgentName.QUALITY
    SOURCE_EXTENSIONS = {".py", ".java", ".js", ".jsx", ".ts", ".tsx"}
    MAX_FINDINGS = 50
    MIN_LONG_LINES_PER_FILE = 3
    TODO_PATTERN = re.compile(r"\b(?:TODO|FIXME|HACK)\b", re.IGNORECASE)

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        texts = self.repository_text_files(request, self.repository_service, self.SOURCE_EXTENSIONS)
        findings: list[AgentFinding] = []
        source = FindingSource(
            source_type="standard_document",
            reference="coding_standards/clean-code.pdf; coding_standards/SonarQube_in_Action.pdf; coding_standards/Python_PEP8_TheStyleGuideForPythonCode.pdf",
        )
        for path, text in sorted(texts.items()):
            lines = text.splitlines()
            if len(lines) > 800:
                findings.append(
                    self._finding(
                        title="Fichier source trÃ¨s volumineux",
                        severity=FindingSeverity.MEDIUM,
                        evidence=f"{len(lines)} lignes dans ce fichier ; le seuil d'analyse est 800.",
                        recommendation="DÃ©couper ce fichier par responsabilitÃ© mÃ©tier ou technique et ajouter des tests ciblÃ©s.",
                        path=path,
                        line=1,
                        source=source,
                    )
                )
            long_lines = [
                (number, len(line))
                for number, line in enumerate(lines, start=1)
                if len(line) > 140
            ]
            if len(long_lines) >= self.MIN_LONG_LINES_PER_FILE:
                first_line, longest_length = max(long_lines, key=lambda item: item[1])
                findings.append(
                    self._finding(
                        title="Lignes difficiles Ã  lire",
                        severity=FindingSeverity.LOW,
                        evidence=(
                            f"{len(long_lines)} ligne(s) dÃ©passent 140 caractÃ¨res "
                            f"(seuil de signalement : {self.MIN_LONG_LINES_PER_FILE}) ; "
                            f"maximum {longest_length} caractÃ¨res."
                        ),
                        recommendation="Extraire des variables ou scinder les instructions pour rendre l'intention lisible.",
                        path=path,
                        line=first_line,
                        source=source,
                    )
                )
            for number, line in enumerate(lines, start=1):
                if self.TODO_PATTERN.search(line):
                    findings.append(
                        self._finding(
                            title="Dette technique signalÃ©e dans le code",
                            severity=FindingSeverity.LOW,
                            evidence="Marqueur TODO, FIXME ou HACK dÃ©tectÃ©.",
                            recommendation="Transformer ce marqueur en TODO priorisÃ© et suivi, ou le rÃ©soudre avant la mise en production.",
                            path=path,
                            line=number,
                            source=source,
                        )
                    )
                if len(findings) >= self.MAX_FINDINGS:
                    break
            if len(findings) >= self.MAX_FINDINGS:
                break
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"ContrÃ´les qualitÃ© dÃ©terministes effectuÃ©s sur {len(texts)} fichiers source ; "
                f"{len(findings)} constat(s) retenu(s), limite {self.MAX_FINDINGS}."
            ),
            findings=findings,
        )

    @staticmethod
    def _finding(title, severity, evidence, recommendation, path, line, source) -> AgentFinding:
        return AgentFinding(
            title=title,
            severity=severity,
            confidence=0.85,
            evidence=evidence,
            recommendation=recommendation,
            location=FindingLocation(path=path, line_start=line, line_end=line),
            sources=[source],
        )
