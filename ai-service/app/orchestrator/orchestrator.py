"""Deterministic orchestration for the first Sprint 3 analysis slice."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict

from app.agents.context_agent import ContextAgent
from app.agents.architecture_agent import ArchitectureAgent
from app.agents.impact_agent import ImpactAgent
from app.agents.documentation_agent import DocumentationAgent
from app.agents.quality_agent import QualityAgent
from app.agents.security_agent import SecurityAgent
from app.agents.structure_agent import StructureAgent
from app.schemas.agents import AgentInput, AgentName, AgentResult, AgentStatus
from app.services.github_service import GitHubRepositoryService


class AnalysisOrchestrator:
    """Fetches a safe repository snapshot once and runs independent agents in parallel."""

    def __init__(
        self,
        repository_service: GitHubRepositoryService | None = None,
        structure_agent: StructureAgent | None = None,
        context_agent: ContextAgent | None = None,
        architecture_agent: ArchitectureAgent | None = None,
        impact_agent: ImpactAgent | None = None,
        documentation_agent: DocumentationAgent | None = None,
        quality_agent: QualityAgent | None = None,
        security_agent: SecurityAgent | None = None,
    ):
        self.repository_service = repository_service or GitHubRepositoryService()
        self.agents = (
            structure_agent or StructureAgent(self.repository_service),
            context_agent or ContextAgent(self.repository_service),
        )
        self.audit_agents = (
            quality_agent or QualityAgent(self.repository_service),
            security_agent or SecurityAgent(self.repository_service),
        )
        self.architecture_agent = architecture_agent or ArchitectureAgent(self.repository_service)
        self.impact_agent = impact_agent or ImpactAgent(self.repository_service)
        self.documentation_agent = documentation_agent or DocumentationAgent(self.repository_service)

    def run_foundation_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        scoped_request = request.model_copy(
            update={"context": {**request.context, "repository_snapshot": snapshot}}
        )
        results: Dict[AgentName, AgentResult] = {}
        with ThreadPoolExecutor(max_workers=len(self.agents)) as executor:
            futures = {executor.submit(agent.run, scoped_request): agent.name for agent in self.agents}
            for future in as_completed(futures):
                name = futures[future]
                try:
                    results[name] = future.result()
                except Exception as error:
                    results[name] = AgentResult(
                        agent=name,
                        status=AgentStatus.PARTIAL,
                        summary="L'agent n'a pas produit de résultat complet.",
                        errors=[type(error).__name__],
                    )
        return results

    def run_quality_security_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        """Run the deterministic P2 checks over one bounded, shared source corpus."""
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        extensions = set().union(*(agent.SOURCE_EXTENSIONS for agent in self.audit_agents))
        corpus = self.repository_service.read_allowed_text_files(snapshot, extensions)
        scoped_request = request.model_copy(
            update={
                "context": {
                    **request.context,
                    "repository_snapshot": snapshot,
                    "repository_text_files": corpus,
                }
            }
        )
        return self._run_parallel(self.audit_agents, scoped_request)

    def run_architecture_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        corpus = self.repository_service.read_allowed_text_files(
            snapshot,
            self.architecture_agent.SOURCE_EXTENSIONS,
        )
        scoped_request = request.model_copy(
            update={
                "context": {
                    **request.context,
                    "repository_snapshot": snapshot,
                    "repository_text_files": corpus,
                }
            }
        )
        return self._run_parallel((self.architecture_agent,), scoped_request)

    def run_full_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        """Execute the currently available Sprint 3 graph from one repository snapshot."""
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        extensions = set(self.architecture_agent.SOURCE_EXTENSIONS).union(
            *(agent.SOURCE_EXTENSIONS for agent in self.audit_agents)
        )
        corpus = self.repository_service.read_allowed_text_files(snapshot, extensions)
        scoped_request = request.model_copy(
            update={
                "context": {
                    **request.context,
                    "repository_snapshot": snapshot,
                    "repository_text_files": corpus,
                }
            }
        )
        results = self._run_parallel(self.agents, scoped_request)
        results.update(self._run_parallel((self.architecture_agent, *self.audit_agents), scoped_request))
        return results

    def run_impact_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        scoped_request = request.model_copy(
            update={"context": {**request.context, "repository_snapshot": snapshot}}
        )
        return self._run_parallel((self.impact_agent,), scoped_request)

    def run_documentation_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        corpus = self.repository_service.read_allowed_text_files(snapshot, self.documentation_agent.SOURCE_EXTENSIONS)
        scoped_request = request.model_copy(
            update={
                "context": {
                    **request.context,
                    "repository_snapshot": snapshot,
                    "repository_text_files": corpus,
                }
            }
        )
        return self._run_parallel((self.documentation_agent,), scoped_request)

    @staticmethod
    def _run_parallel(agents, request: AgentInput) -> Dict[AgentName, AgentResult]:
        results: Dict[AgentName, AgentResult] = {}
        with ThreadPoolExecutor(max_workers=len(agents)) as executor:
            futures = {executor.submit(agent.run, request): agent.name for agent in agents}
            for future in as_completed(futures):
                name = futures[future]
                try:
                    results[name] = future.result()
                except Exception as error:
                    results[name] = AgentResult(
                        agent=name,
                        status=AgentStatus.PARTIAL,
                        summary="L'agent n'a pas produit de rÃ©sultat complet.",
                        errors=[type(error).__name__],
                    )
        return results
