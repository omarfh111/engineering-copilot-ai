"""Deterministic orchestration for the first Sprint 3 analysis slice."""

from concurrent.futures import ThreadPoolExecutor, wait
from time import perf_counter
from typing import Dict

from app.agents.context_agent import ContextAgent
from app.agents.architecture_agent import ArchitectureAgent
from app.agents.impact_agent import ImpactAgent
from app.agents.documentation_agent import DocumentationAgent
from app.agents.quality_agent import QualityAgent
from app.agents.security_agent import SecurityAgent
from app.agents.structure_agent import StructureAgent
from app.agents.todo_agent import TodoAgent
from app.schemas.agents import AgentInput, AgentName, AgentResult, AgentStatus
from app.services.github_service import GitHubRepositoryService


class AnalysisOrchestrator:
    """Fetches a safe repository snapshot once and runs independent agents in parallel."""

    # Spring's response timeout is deliberately higher (180s), so an agent
    # timeout returns a structured PARTIAL audit instead of a socket timeout.
    AGENT_TIMEOUT_SECONDS = 150

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
        todo_agent: TodoAgent | None = None,
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
        self.todo_agent = todo_agent or TodoAgent()

    def run_todo_proposal_generation(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        """Use only human-approved findings; this agent never writes business TODOs."""
        return self._run_parallel((self.todo_agent,), request)

    def run_foundation_analysis(self, request: AgentInput) -> Dict[AgentName, AgentResult]:
        snapshot = self.repository_service.inspect_public_repository(
            request.repository.url,
            request.repository.branch,
        )
        scoped_request = request.model_copy(
            update={"context": {**request.context, "repository_snapshot": snapshot}}
        )
        return self._run_parallel(self.agents, scoped_request)

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
        downstream_request = scoped_request.model_copy(
            update={
                "context": {
                    **scoped_request.context,
                    "foundation_results": {
                        name.value: result.model_dump(mode="json")
                        for name, result in results.items()
                    },
                }
            }
        )
        results.update(self._run_parallel((self.architecture_agent, *self.audit_agents), downstream_request))
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
        executor = ThreadPoolExecutor(max_workers=len(agents))
        try:
            futures = {
                executor.submit(agent.run, request): (agent.name, perf_counter())
                for agent in agents
            }
            completed, pending = wait(futures, timeout=AnalysisOrchestrator.AGENT_TIMEOUT_SECONDS)
            for future in completed:
                name, started_at = futures[future]
                duration_ms = round((perf_counter() - started_at) * 1000)
                try:
                    results[name] = future.result().model_copy(update={"duration_ms": duration_ms})
                except Exception as error:
                    results[name] = AgentResult(
                        agent=name,
                        status=AgentStatus.PARTIAL,
                        summary="L'agent n'a pas produit de résultat complet.",
                        errors=[type(error).__name__],
                        duration_ms=duration_ms,
                    )
            for future in pending:
                name, started_at = futures[future]
                future.cancel()
                results[name] = AgentResult(
                    agent=name,
                    status=AgentStatus.PARTIAL,
                    summary="L'agent a dépassé le délai d'exécution autorisé.",
                    errors=["AgentTimeout"],
                    duration_ms=round((perf_counter() - started_at) * 1000),
                )
        finally:
            # Do not block the completed API response behind an uncooperative agent.
            executor.shutdown(wait=False, cancel_futures=True)
        return results
