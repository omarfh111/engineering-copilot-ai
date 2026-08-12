"""Base contract used by every Sprint 3 agent."""

from abc import ABC, abstractmethod

from app.schemas.agents import AgentInput, AgentName, AgentResult
from app.services.github_service import GitHubRepositoryService, RepositorySnapshot


class BaseAgent(ABC):
    """An agent analyses data only and returns a validated structured result."""

    name: AgentName

    @abstractmethod
    def run(self, request: AgentInput) -> AgentResult:
        """Run without mutating a repository, database record, or TODO."""
        raise NotImplementedError

    @staticmethod
    def repository_snapshot(request: AgentInput, repository_service: GitHubRepositoryService) -> RepositorySnapshot:
        snapshot = request.context.get("repository_snapshot")
        if isinstance(snapshot, RepositorySnapshot):
            return snapshot
        return repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )

    @staticmethod
    def repository_text_files(
        request: AgentInput,
        repository_service: GitHubRepositoryService,
        extensions: set[str],
    ) -> dict[str, str]:
        files = request.context.get("repository_text_files")
        if isinstance(files, dict) and all(isinstance(path, str) and isinstance(text, str) for path, text in files.items()):
            return files
        return repository_service.read_allowed_text_files(
            BaseAgent.repository_snapshot(request, repository_service),
            extensions,
        )
