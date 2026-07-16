from app.schemas.agents import (
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingSeverity,
)
from app.services.github_service import GitHubRepositoryService, RepositoryAccessError


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
