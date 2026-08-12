"""Repository structure analysis agent."""

from collections import Counter
from typing import Iterable

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
from app.services.github_service import GitHubRepositoryService, RepositorySnapshot


class StructureAgent(BaseAgent):
    name = AgentName.STRUCTURE

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        snapshot = self._snapshot_from_request(request)
        files = snapshot.files
        top_level_directories = sorted(
            {item["path"].split("/", 1)[0] for item in files if "/" in item["path"]}
        )
        extension_counts = Counter(
            item["path"].rsplit(".", 1)[-1].lower()
            for item in files
            if "." in item["path"]
        )
        findings: list[AgentFinding] = []
        file_paths = {item["path"].casefold() for item in files}
        source = FindingSource(source_type="repository", reference=f"{snapshot.owner}/{snapshot.name}@{snapshot.commit_sha}")

        if "readme.md" not in file_paths:
            findings.append(
                AgentFinding(
                    title="README absent du périmètre analysé",
                    severity=FindingSeverity.LOW,
                    confidence=0.95,
                    evidence="Aucun fichier README.md autorisé n'a été trouvé à la racine du dépôt.",
                    recommendation="Ajouter un README présentant le projet, son installation et son exécution.",
                    sources=[source],
                )
            )
        if len(top_level_directories) == 0 and len(files) > 15:
            findings.append(
                AgentFinding(
                    title="Structure de dépôt peu segmentée",
                    severity=FindingSeverity.LOW,
                    confidence=0.75,
                    evidence="Le dépôt contient plusieurs fichiers mais aucun répertoire applicatif détecté.",
                    recommendation="Regrouper le code par modules ou responsabilités explicites.",
                    sources=[source],
                )
            )

        extensions = ", ".join(
            f".{extension} ({count})" for extension, count in extension_counts.most_common(8)
        ) or "aucune extension reconnue"
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"{len(files)} fichiers autorisés analysés sur {snapshot.owner}/{snapshot.name} "
                f"au commit {snapshot.commit_sha[:12]}. Répertoires principaux : "
                f"{', '.join(top_level_directories[:12]) or 'aucun'}. Extensions : {extensions}."
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
