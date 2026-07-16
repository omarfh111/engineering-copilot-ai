"""Technology and repository context analysis agent."""

from app.agents.base import BaseAgent
from app.schemas.agents import (
    AgentFinding,
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingSeverity,
    FindingSource,
)
from app.services.github_service import GitHubRepositoryService, RepositorySnapshot


class ContextAgent(BaseAgent):
    name = AgentName.CONTEXT

    TECHNOLOGY_MARKERS = {
        "pom.xml": "Java / Maven",
        "build.gradle": "Java / Gradle",
        "build.gradle.kts": "Kotlin / Gradle",
        "package.json": "Node.js / JavaScript or TypeScript",
        "requirements.txt": "Python",
        "pyproject.toml": "Python",
        "dockerfile": "Docker",
        "docker-compose.yml": "Docker Compose",
        "docker-compose.yaml": "Docker Compose",
    }
    EXTENSION_MARKERS = {
        ".py": "Python",
        ".java": "Java",
        ".kt": "Kotlin",
        ".ts": "TypeScript",
        ".tsx": "TypeScript / React",
        ".jsx": "JavaScript / React",
        ".js": "JavaScript",
    }

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        snapshot = self._snapshot_from_request(request)
        paths = [item["path"] for item in snapshot.files]
        lowered_paths = {path.casefold() for path in paths}
        technologies = sorted(
            technology
            for marker, technology in self.TECHNOLOGY_MARKERS.items()
            if marker in lowered_paths or any(path.endswith(f"/{marker}") for path in lowered_paths)
        )
        technologies.extend(
            technology
            for extension, technology in self.EXTENSION_MARKERS.items()
            if any(path.casefold().endswith(extension) for path in paths)
            and technology not in technologies
        )
        technologies.sort()
        findings: list[AgentFinding] = []
        source = FindingSource(source_type="repository", reference=f"{snapshot.owner}/{snapshot.name}@{snapshot.commit_sha}")

        if not technologies:
            findings.append(
                AgentFinding(
                    title="Stack technique non identifié avec les manifests autorisés",
                    severity=FindingSeverity.LOW,
                    confidence=0.65,
                    evidence="Aucun manifest standard de langage, package ou build n'a été trouvé.",
                    recommendation="Ajouter ou versionner le manifest de build et les dépendances du projet.",
                    sources=[source],
                )
            )

        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"Contexte détecté pour {snapshot.owner}/{snapshot.name} : "
                f"{', '.join(technologies) if technologies else 'stack non déterminé'} ; "
                f"branche demandée : {snapshot.branch} ; commit : {snapshot.commit_sha[:12]}."
            ),
            findings=findings,
        )

    def _snapshot_from_request(self, request: AgentInput) -> RepositorySnapshot:
        snapshot = request.context.get("repository_snapshot")
        if isinstance(snapshot, RepositorySnapshot):
            return snapshot
        return self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
