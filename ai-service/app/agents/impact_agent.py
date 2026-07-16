"""On-demand, deterministic impact analysis for a requested repository change."""

from pathlib import PurePosixPath

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
    ImpactAssessment,
)
from app.services.github_service import GitHubRepositoryService


class ImpactAgent(BaseAgent):
    """Suggests review scope from a declared change; it never edits or executes code."""

    name = AgentName.IMPACT

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        if request.change_request is None:
            return AgentResult(
                agent=self.name,
                status=AgentStatus.PARTIAL,
                summary="Analyse d'impact non lancée : une description de modification ou de problème est requise.",
            )
        snapshot = self.repository_snapshot(request, self.repository_service)
        paths = sorted(item["path"] for item in snapshot.files)
        requested_paths = [path.replace("\\", "/").lstrip("/") for path in request.change_request.paths]
        impacted = self._resolve_impacted_paths(paths, requested_paths)
        tests = self._suggest_tests(paths, impacted)
        risks = self._risk_areas(request.change_request.description, impacted)
        confidence = 0.9 if requested_paths and impacted else 0.55
        assessment = ImpactAssessment(
            requested_change=request.change_request.description,
            impacted_paths=impacted,
            suggested_test_paths=tests,
            risk_areas=risks,
            confidence=confidence,
        )
        findings = self._findings(impacted, tests, risks)
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"Analyse d'impact pour {len(impacted)} fichier(s) concerné(s), "
                f"{len(tests)} test(s) suggéré(s) et {len(risks)} zone(s) de risque."
            ),
            findings=findings,
            impact=assessment,
        )

    @staticmethod
    def _resolve_impacted_paths(paths: list[str], requested_paths: list[str]) -> list[str]:
        if not requested_paths:
            return []
        path_set = set(paths)
        impacted: set[str] = set()
        for requested in requested_paths:
            if requested in path_set:
                impacted.add(requested)
                continue
            requested_parent = str(PurePosixPath(requested).parent)
            requested_name = PurePosixPath(requested).stem.casefold()
            for path in paths:
                candidate = PurePosixPath(path)
                if requested_parent not in {"", "."} and str(candidate.parent).startswith(requested_parent):
                    impacted.add(path)
                elif requested_name and requested_name in candidate.stem.casefold():
                    impacted.add(path)
        return sorted(impacted)[:100]

    @staticmethod
    def _suggest_tests(paths: list[str], impacted: list[str]) -> list[str]:
        test_paths = [path for path in paths if "/test" in f"/{path.casefold()}" or path.casefold().startswith("test")]
        generic_stems = {"app", "base", "controller", "index", "main", "model", "router", "service", "utils"}
        stems = {
            PurePosixPath(path).stem.casefold()
            for path in impacted
            if PurePosixPath(path).stem.casefold() not in generic_stems
        }
        module_names = {
            part.casefold()
            for path in impacted
            for part in PurePosixPath(path).parent.parts
            if len(part) >= 5 and part.casefold() not in {"backend", "frontend", "source", "tests"}
        }
        related = [
            path for path in test_paths
            if (
                any(stem in PurePosixPath(path).stem.casefold() for stem in stems)
                or any(module in path.casefold() for module in module_names)
            )
        ]
        # Returning an unrelated test creates false confidence. When no test
        # shares a meaningful module name, ask for a targeted test instead.
        return sorted(related)[:30]

    @staticmethod
    def _risk_areas(description: str, impacted: list[str]) -> list[str]:
        text = f"{description} {' '.join(impacted)}".casefold()
        keywords = {
            "sécurité / authentification": ("auth", "jwt", "security", "password", "token", "guard"),
            "données / migration": ("database", "postgres", "sql", "migration", "entity", "model"),
            "API / contrat client": ("api", "router", "controller", "endpoint", "route"),
            "RAG / documents": ("rag", "qdrant", "embedding", "document", "ingest"),
            "interface utilisateur": ("frontend", ".jsx", ".tsx", "component", "page"),
        }
        return [label for label, terms in keywords.items() if any(term in text for term in terms)]

    @staticmethod
    def _findings(impacted: list[str], tests: list[str], risks: list[str]) -> list[AgentFinding]:
        source = FindingSource(source_type="analysis_rule", reference="Sprint 3 impact analysis scope rules")
        findings: list[AgentFinding] = []
        if not impacted:
            findings.append(AgentFinding(
                title="Périmètre de fichiers non résolu",
                severity=FindingSeverity.MEDIUM,
                confidence=0.65,
                evidence="Aucun chemin déclaré ne correspond au commit analysé.",
                recommendation="Préciser au moins un chemin relatif au dépôt, depuis le résultat du problème ou de la revue de code.",
                sources=[source],
            ))
        if impacted and not tests:
            findings.append(AgentFinding(
                title="Aucun test associé détecté",
                severity=FindingSeverity.MEDIUM,
                confidence=0.75,
                evidence="Le périmètre impacté ne permet pas d'identifier un test versionné associé.",
                recommendation="Ajouter ou sélectionner un test ciblé avant validation de la modification.",
                location=FindingLocation(path=impacted[0]),
                sources=[source],
            ))
        for risk in risks:
            findings.append(AgentFinding(
                title=f"Vérification renforcée : {risk}",
                severity=FindingSeverity.MEDIUM,
                confidence=0.8,
                evidence="La description ou les chemins de la modification touchent une zone à risque.",
                recommendation="Faire valider cette zone par un relecteur et exécuter les tests ciblés avant fusion.",
                sources=[source],
            ))
        return findings
