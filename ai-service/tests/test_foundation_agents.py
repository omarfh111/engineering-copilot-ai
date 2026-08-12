from app.agents.context_agent import ContextAgent
from app.agents.architecture_agent import ArchitectureAgent
from app.agents.impact_agent import ImpactAgent
from app.agents.documentation_agent import DocumentationAgent
from app.agents.todo_agent import TodoAgent
from app.agents.quality_agent import QualityAgent
from app.agents.security_agent import SecurityAgent
from app.agents.structure_agent import StructureAgent
from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import (
    ApprovedFinding,
    ArchitectureProfile,
    AgentFinding,
    AgentInput,
    AgentName,
    AgentStatus,
    ChangeRequest,
    ComplianceStatus,
    FindingSeverity,
)
from scripts.run_architecture_analysis import build_markdown_report
from scripts.run_impact_analysis import RULESET_VERSION
from app.services.github_service import RepositorySnapshot


class FakeRepositoryService:
    def __init__(self):
        self.calls = 0

    def inspect_public_repository(self, url, branch):
        self.calls += 1
        return RepositorySnapshot(
            owner="example",
            name="project",
            branch=branch,
            commit_sha="abc123456789",
            files=[
                {"path": "pom.xml", "size": 300},
                {"path": "backend/src/Main.java", "size": 800},
                {"path": "package.json", "size": 200},
                {"path": "frontend/src/App.tsx", "size": 500},
            ],
        )

    def read_allowed_text_files(self, snapshot, extensions):
        return {
            "src/app.py": "# TODO: split this module\nAPI_KEY = 'super-secret-value'\nrequests.get(url, verify=False)\n",
            "src/config.py": "allow_origins = ['*']\nDEBUG = True\n",
        }


def build_request():
    return AgentInput(
        analysis_id=1,
        project_id=2,
        requested_by=3,
        correlation_id="correlation-123",
        repository={"url": "https://github.com/example/project", "branch": "main"},
    )


def test_foundation_agents_share_one_safe_repository_snapshot():
    repository_service = FakeRepositoryService()
    orchestrator = AnalysisOrchestrator(
        repository_service=repository_service,
        structure_agent=StructureAgent(repository_service),
        context_agent=ContextAgent(repository_service),
    )

    results = orchestrator.run_foundation_analysis(build_request())

    assert repository_service.calls == 1
    assert results[AgentName.STRUCTURE].status == AgentStatus.COMPLETED
    assert results[AgentName.CONTEXT].status == AgentStatus.COMPLETED
    assert "Java / Maven" in results[AgentName.CONTEXT].summary
    assert "Node.js" in results[AgentName.CONTEXT].summary


def test_context_agent_detects_languages_from_source_extensions():
    repository_service = FakeRepositoryService()
    result = ContextAgent(repository_service).run(build_request())

    assert "Java" in result.summary
    assert "TypeScript / React" in result.summary


def test_quality_agent_returns_locations_for_deterministic_rules():
    result = QualityAgent(FakeRepositoryService()).run(build_request())

    assert result.status == AgentStatus.COMPLETED
    assert result.findings[0].location.path == "src/app.py"
    assert result.findings[0].location.line_start == 1
    assert result.findings[0].sources[0].source_type == "standard_document"


def test_quality_agent_groups_long_lines_only_when_the_file_reaches_the_threshold():
    repository_service = FakeRepositoryService()
    repository_service.read_allowed_text_files = lambda snapshot, extensions: {
        "src/readable.py": "x" * 141,
        "src/noisy.py": "\n".join(["x" * 141] * 3),
    }

    result = QualityAgent(repository_service).run(build_request())

    assert len(result.findings) == 1
    assert result.findings[0].location.path == "src/noisy.py"


def test_security_agent_masks_hardcoded_secret_evidence():
    result = SecurityAgent(FakeRepositoryService()).run(build_request())

    assert result.status == AgentStatus.COMPLETED
    assert any(finding.severity.value == "HIGH" for finding in result.findings)
    assert "super-secret-value" not in " ".join(finding.evidence for finding in result.findings)
    assert any(finding.location.path == "src/app.py" for finding in result.findings)


def test_architecture_agent_detects_frontend_backend_and_missing_docs():
    result = ArchitectureAgent(FakeRepositoryService()).run(build_request())

    assert result.status == AgentStatus.COMPLETED
    assert result.architecture.style == "application web séparée frontend/backend"
    assert "Frontend" in result.architecture.mermaid_diagram
    assert any("architecture" in finding.title.casefold() for finding in result.findings)


def test_architecture_agent_checks_engineering_copilot_profile_explicitly():
    request = build_request().model_copy(
        update={"architecture_profile": ArchitectureProfile.ENGINEERING_COPILOT}
    )
    result = ArchitectureAgent(FakeRepositoryService()).run(request)

    checks = {check.requirement_id: check for check in result.architecture.compliance_checks}
    assert len(checks) == 9
    assert checks["EC-01"].status == ComplianceStatus.COMPLIANT
    assert checks["EC-08"].status in {ComplianceStatus.MISSING, ComplianceStatus.PARTIAL}


def test_full_analysis_reuses_one_snapshot_and_one_source_corpus():
    repository_service = FakeRepositoryService()
    text_reads = 0
    original_read = repository_service.read_allowed_text_files

    def counted_read(snapshot, extensions):
        nonlocal text_reads
        text_reads += 1
        return original_read(snapshot, extensions)

    repository_service.read_allowed_text_files = counted_read
    results = AnalysisOrchestrator(repository_service=repository_service).run_full_analysis(build_request())

    assert repository_service.calls == 1
    assert text_reads == 1
    assert set(results) == {
        AgentName.STRUCTURE,
        AgentName.CONTEXT,
        AgentName.ARCHITECTURE,
        AgentName.QUALITY,
        AgentName.SECURITY,
    }


def test_architecture_report_contains_mermaid_and_profile_checks():
    request = build_request().model_copy(
        update={"architecture_profile": ArchitectureProfile.ENGINEERING_COPILOT}
    )
    result = ArchitectureAgent(FakeRepositoryService()).run(request)

    report = build_markdown_report(result)

    assert "```mermaid" in report
    assert "EC-08" in report
    assert "Rapport d'architecture généré" in report


def test_architecture_agent_uses_readme_architecture_and_setup_sections():
    repository_service = FakeRepositoryService()
    repository_service.read_allowed_text_files = lambda snapshot, extensions: {
        "README.md": "## System Overview\n## Architecture\n```mermaid\nflowchart LR\n```\n## Setup & Installation\nuvicorn app.main:app\nnpm run dev",
    }

    result = ArchitectureAgent(repository_service).run(build_request())

    titles = {finding.title for finding in result.findings}
    assert "Décisions d'architecture non documentées" not in titles
    assert "Contrat de déploiement non visible dans le dépôt" not in titles


def test_impact_agent_requires_a_change_request_before_analysis():
    result = ImpactAgent(FakeRepositoryService()).run(build_request())

    assert result.status == AgentStatus.PARTIAL
    assert result.impact is None


def test_impact_agent_returns_files_tests_and_risk_scope():
    request = build_request().model_copy(
        update={
            "change_request": ChangeRequest(
                description="Update API router authentication",
                paths=["backend/src/Main.java"],
            )
        }
    )
    result = ImpactAgent(FakeRepositoryService()).run(request)

    assert result.status == AgentStatus.COMPLETED
    assert result.impact.impacted_paths == ["backend/src/Main.java"]
    assert "sécurité / authentification" in result.impact.risk_areas
    assert "API / contrat client" in result.impact.risk_areas
    assert result.impact.suggested_test_paths == []
    assert any(finding.title == "Aucun test associé détecté" for finding in result.findings)


def test_impact_agent_does_not_match_a_generic_router_test_from_another_module():
    repository_service = FakeRepositoryService()
    snapshot = repository_service.inspect_public_repository("https://github.com/example/project", "main")
    repository_service.inspect_public_repository = lambda url, branch: type(snapshot)(
        owner=snapshot.owner,
        name=snapshot.name,
        branch=snapshot.branch,
        commit_sha=snapshot.commit_sha,
        files=[
            {"path": "backend/app/medical_triage/router.py", "size": 100},
            {"path": "backend/tests/test_intent_router.py", "size": 100},
        ],
    )
    request = build_request().model_copy(
        update={
            "change_request": ChangeRequest(
                description="Modify triage router",
                paths=["backend/app/medical_triage/router.py"],
            )
        }
    )

    result = ImpactAgent(repository_service).run(request)

    assert result.impact.suggested_test_paths == []


def test_impact_script_identifies_the_module_aware_ruleset():
    assert RULESET_VERSION == "module-aware-v2"


def test_documentation_agent_generates_a_sourced_markdown_inventory():
    repository_service = FakeRepositoryService()
    repository_service.read_allowed_text_files = lambda snapshot, extensions: {
        "README.md": "# Project\n## Architecture\n## Setup\n## API\n## Tests\n## Security",
        "docs/decisions.md": "Architecture decisions",
    }

    result = DocumentationAgent(repository_service).run(build_request())

    assert result.status == AgentStatus.COMPLETED
    assert result.documentation.title.startswith("Technical documentation")
    assert "README.md" in result.documentation.markdown
    assert result.findings == []


def test_documentation_agent_generates_without_a_readme():
    repository_service = FakeRepositoryService()
    repository_service.read_allowed_text_files = lambda snapshot, extensions: {
        "backend/requirements.txt": "fastapi",
        "backend/app/main.py": "from fastapi import FastAPI",
    }

    result = DocumentationAgent(repository_service).run(build_request())

    assert result.status == AgentStatus.COMPLETED
    assert "README.md" not in result.documentation.source_paths
    assert "pom.xml" in result.documentation.source_paths


def test_todo_agent_requires_human_approved_findings():
    result = TodoAgent().run(build_request())

    assert result.status == AgentStatus.PARTIAL
    assert result.todo_proposals == []


def test_todo_agent_only_generates_a_proposal_from_an_approved_finding():
    approved_finding = ApprovedFinding(
        agent=AgentName.SECURITY,
        approved_by=3,
        review_id=9,
        finding=AgentFinding(
            title="CORS ouvert à toutes les origines",
            severity=FindingSeverity.MEDIUM,
            confidence=0.9,
            evidence="Une configuration wildcard est détectée.",
            recommendation="Autoriser seulement les origines frontend connues.",
            location={"path": "backend/app/main.py", "line_start": 51},
        ),
    )
    request = build_request().model_copy(update={"approved_findings": [approved_finding]})

    result = TodoAgent().run(request)

    assert result.status == AgentStatus.COMPLETED
    assert result.todo_proposals[0].title.startswith("[SECURITY]")
    assert result.todo_proposals[0].location.path == "backend/app/main.py"
