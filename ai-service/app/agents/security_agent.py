"""Deterministic, non-invasive security checks for the Sprint 3 MVP."""

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


class SecurityAgent(BaseAgent):
    """Finds a deliberately small set of high-signal patterns and redacts evidence."""

    name = AgentName.SECURITY
    SOURCE_EXTENSIONS = {".py", ".java", ".js", ".jsx", ".ts", ".tsx", ".properties", ".yml", ".yaml"}
    MAX_FINDINGS = 50
    SECRET_PATTERN = re.compile(
        r"(?i)\b(?:api[_-]?key|secret|password|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*(['\"])(?!\$\{|change-this)[^'\"\r\n]{8,}\1"
    )
    INSECURE_TLS_PATTERN = re.compile(r"(?i)\b(?:verify|verify_ssl)\s*=\s*false\b")
    WILDCARD_CORS_PATTERN = re.compile(r"(?i)(?:allow_origins|allowedorigins|allowed_origins)\s*=?\s*[\[(]?[\"']\*[\"']")
    DEBUG_PATTERN = re.compile(r"(?i)\bdebug\s*=\s*true\b")

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        texts = self.repository_text_files(request, self.repository_service, self.SOURCE_EXTENSIONS)
        findings: list[AgentFinding] = []
        for path, text in sorted(texts.items()):
            for number, line in enumerate(text.splitlines(), start=1):
                if self.SECRET_PATTERN.search(line):
                    findings.append(self._finding(
                        "Identifiant sensible potentiellement codÃ© en dur", FindingSeverity.HIGH,
                        "Une affectation d'identifiant sensible contient une valeur littÃ©rale masquÃ©e.",
                        "Retirer la valeur du dÃ©pÃ´t, la rÃ©voquer si elle est rÃ©elle, puis utiliser un gestionnaire de secrets ou une variable d'environnement.",
                        path, number, "security/OWASP_SCP_Quick_Reference_Guide_v21.pdf; security/nist.sp.800-218.pdf",
                    ))
                if self.INSECURE_TLS_PATTERN.search(line):
                    findings.append(self._finding(
                        "Validation TLS dÃ©sactivÃ©e", FindingSeverity.HIGH,
                        "Un appel semble dÃ©sactiver la validation du certificat TLS.",
                        "Activer la validation TLS et installer la chaÃ®ne de certificats correcte ; ne jamais contourner cette vÃ©rification en production.",
                        path, number, "security/OWASPLondon_20190225_vanderaj_ASVSv4.pdf",
                    ))
                if self.WILDCARD_CORS_PATTERN.search(line):
                    findings.append(self._finding(
                        "CORS ouvert Ã  toutes les origines", FindingSeverity.MEDIUM,
                        "Une configuration CORS semble accepter l'origine wildcard.",
                        "Autoriser explicitement les origines frontend attendues et limiter les mÃ©thodes et en-tÃªtes.",
                        path, number, "security/owasp-api-security-top-10.pdf",
                    ))
                if self.DEBUG_PATTERN.search(line):
                    findings.append(self._finding(
                        "Mode debug activÃ© dans le code versionnÃ©", FindingSeverity.MEDIUM,
                        "Une configuration debug=true a Ã©tÃ© dÃ©tectÃ©e.",
                        "DÃ©porter ce paramÃ¨tre dans une configuration d'environnement et le maintenir dÃ©sactivÃ© en production.",
                        path, number, "security/OWASP_SCP_Quick_Reference_Guide_v21.pdf",
                    ))
                if len(findings) >= self.MAX_FINDINGS:
                    break
            if len(findings) >= self.MAX_FINDINGS:
                break
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"ContrÃ´les sÃ©curitÃ© dÃ©terministes effectuÃ©s sur {len(texts)} fichiers ; "
                f"{len(findings)} constat(s) retenu(s), valeurs sensibles masquÃ©es."
            ),
            findings=findings,
        )

    @staticmethod
    def _finding(title, severity, evidence, recommendation, path, line, reference) -> AgentFinding:
        return AgentFinding(
            title=title,
            severity=severity,
            confidence=0.9,
            evidence=evidence,
            recommendation=recommendation,
            location=FindingLocation(path=path, line_start=line, line_end=line),
            sources=[FindingSource(source_type="standard_document", reference=reference)],
        )
