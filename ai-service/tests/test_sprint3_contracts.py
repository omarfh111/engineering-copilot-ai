from app.schemas.agents import (
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingSeverity,
    ApprovedFinding,
    AgentFinding,
)
from app.agents.todo_agent import TodoAgent
from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.services.github_service import GitHubRepositoryService, RepositoryAccessError
from app.services.embedding_service import EmbeddingService


def test_agent_result_keeps_structured_finding():
    result = AgentResult(
        agent=AgentName.SECURITY,
        status=AgentStatus.COMPLETED,
        summary="One finding",
        findings=[
            {
                "title": "Exposed secret",
                "severity": FindingSeverity.HIGH,
                "confidence": 0.9,
                "evidence": "Masked evidence",
            }
        ],
    )

    assert result.findings[0].severity == FindingSeverity.HIGH


def test_agent_input_requires_project_and_repository_scope():
    request = AgentInput(
        analysis_id=1,
        project_id=2,
        requested_by=3,
        correlation_id="12345678",
        repository={"url": "https://github.com/openai/openai-python"},
    )

    assert request.repository.branch == "main"


def test_github_url_parser_accepts_only_public_https_urls():
    assert GitHubRepositoryService.parse_public_url("https://github.com/openai/openai-python.git") == (
        "openai",
        "openai-python",
    )

    try:
        GitHubRepositoryService.parse_public_url("git@github.com:openai/openai-python.git")
    except RepositoryAccessError:
        pass
    else:
        raise AssertionError("SSH URLs must be rejected")


def test_todo_agent_requires_human_approved_findings():
    request = AgentInput(analysis_id=1, project_id=2, requested_by=3, correlation_id="12345678",
                         repository={"url": "https://github.com/openai/openai-python"})
    result = TodoAgent().run(request)
    assert result.status == AgentStatus.PARTIAL
    assert result.todo_proposals == []


def test_todo_agent_generates_proposal_but_never_persists_a_todo():
    request = AgentInput(
        analysis_id=1, project_id=2, requested_by=3, correlation_id="12345678",
        repository={"url": "https://github.com/openai/openai-python"},
        approved_findings=[ApprovedFinding(
            agent=AgentName.SECURITY, approved_by=3,
            finding=AgentFinding(title="Restrict CORS", severity=FindingSeverity.MEDIUM,
                                 confidence=0.9, evidence="Wildcard origin", recommendation="Allow known origins"),
        )],
    )
    result = TodoAgent().run(request)
    assert result.status == AgentStatus.COMPLETED
    assert len(result.todo_proposals) == 1
    assert result.todo_proposals[0].title.startswith("[SECURITY]")


def test_orchestrator_records_agent_duration_for_operational_traceability():
    class FastAgent:
        name = AgentName.CONTEXT

        def run(self, request):
            return AgentResult(
                agent=self.name,
                status=AgentStatus.COMPLETED,
                summary="Completed",
            )

    request = AgentInput(
        analysis_id=1, project_id=2, requested_by=3, correlation_id="12345678",
        repository={"url": "https://github.com/openai/openai-python"},
    )
    result = AnalysisOrchestrator._run_parallel((FastAgent(),), request)

    assert result[AgentName.CONTEXT].duration_ms is not None
    assert result[AgentName.CONTEXT].duration_ms >= 0


def test_embedding_service_splits_large_openai_requests_without_losing_order():
    texts = ["x" * 1_000 for _ in range(1_000)]
    batches = list(EmbeddingService._openai_batches(texts))

    assert len(batches) == 2
    assert batches[0] + batches[1] == texts
