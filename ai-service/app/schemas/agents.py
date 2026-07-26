"""Shared, provider-agnostic contracts for Sprint 3 agents."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AgentName(str, Enum):
    STRUCTURE = "structure"
    CONTEXT = "context"
    ARCHITECTURE = "architecture"
    QUALITY = "quality"
    SECURITY = "security"
    IMPACT = "impact"
    DOCUMENTATION = "documentation"
    TODO = "todo"


class AgentStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class ArchitectureProfile(str, Enum):
    """Reference architecture selected explicitly by the requesting project."""

    ENGINEERING_COPILOT = "engineering_copilot"


class ComplianceStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    PARTIAL = "PARTIAL"
    MISSING = "MISSING"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class FindingSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RepositoryScope(BaseModel):
    repository_id: Optional[int] = Field(default=None, ge=1)
    url: str = Field(..., min_length=12, max_length=2048)
    branch: str = Field(default="main", min_length=1, max_length=255)
    commit_sha: Optional[str] = Field(default=None, min_length=7, max_length=64)


class ChangeRequest(BaseModel):
    """A user-approved change or problem to scope impact analysis."""

    description: str = Field(..., min_length=5, max_length=4000)
    paths: List[str] = Field(default_factory=list, max_length=50)


class FindingLocation(BaseModel):
    path: Optional[str] = Field(default=None, max_length=2048)
    line_start: Optional[int] = Field(default=None, ge=1)
    line_end: Optional[int] = Field(default=None, ge=1)


class FindingSource(BaseModel):
    source_type: str = Field(..., min_length=1, max_length=80)
    reference: str = Field(..., min_length=1, max_length=2048)


class AgentFinding(BaseModel):
    title: str = Field(..., min_length=3, max_length=250)
    severity: FindingSeverity = FindingSeverity.MEDIUM
    confidence: float = Field(..., ge=0, le=1)
    evidence: str = Field(..., min_length=1, max_length=8000)
    recommendation: Optional[str] = Field(default=None, max_length=4000)
    location: Optional[FindingLocation] = None
    sources: List[FindingSource] = Field(default_factory=list)


class ModelTrace(BaseModel):
    model: Optional[str] = None
    duration_ms: Optional[int] = Field(default=None, ge=0)
    prompt_version: Optional[str] = None


class ArchitectureComponent(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    component_type: str = Field(..., min_length=1, max_length=80)
    evidence_paths: List[str] = Field(default_factory=list, max_length=20)


class ArchitectureFlow(BaseModel):
    source: str = Field(..., min_length=1, max_length=120)
    target: str = Field(..., min_length=1, max_length=120)
    protocol: str = Field(..., min_length=1, max_length=120)
    evidence: str = Field(..., min_length=1, max_length=500)


class ArchitectureComplianceCheck(BaseModel):
    requirement_id: str = Field(..., min_length=1, max_length=80)
    requirement: str = Field(..., min_length=1, max_length=500)
    status: ComplianceStatus
    evidence: str = Field(..., min_length=1, max_length=1000)
    recommendation: Optional[str] = Field(default=None, max_length=2000)
    sources: List[FindingSource] = Field(default_factory=list)


class ArchitectureBlueprint(BaseModel):
    style: str = Field(..., min_length=1, max_length=200)
    components: List[ArchitectureComponent] = Field(default_factory=list)
    flows: List[ArchitectureFlow] = Field(default_factory=list)
    mermaid_diagram: str = Field(..., min_length=1, max_length=12000)
    compliance_checks: List[ArchitectureComplianceCheck] = Field(default_factory=list)


class ImpactAssessment(BaseModel):
    requested_change: str = Field(..., min_length=1, max_length=4000)
    impacted_paths: List[str] = Field(default_factory=list, max_length=100)
    suggested_test_paths: List[str] = Field(default_factory=list, max_length=100)
    risk_areas: List[str] = Field(default_factory=list, max_length=30)
    confidence: float = Field(..., ge=0, le=1)


class GeneratedDocumentation(BaseModel):
    title: str = Field(..., min_length=1, max_length=250)
    markdown: str = Field(..., min_length=1, max_length=30000)
    source_paths: List[str] = Field(default_factory=list, max_length=100)


class ApprovedFinding(BaseModel):
    """A finding explicitly approved through the SAE human review workflow."""

    agent: AgentName
    finding: AgentFinding
    approved_by: int = Field(..., ge=1)
    review_id: Optional[int] = Field(default=None, ge=1)


class TodoProposal(BaseModel):
    title: str = Field(..., min_length=3, max_length=250)
    description: str = Field(..., min_length=1, max_length=8000)
    priority: FindingSeverity
    origin_agent: AgentName
    location: Optional[FindingLocation] = None
    sources: List[FindingSource] = Field(default_factory=list)


class AgentInput(BaseModel):
    analysis_id: int = Field(..., ge=1)
    project_id: int = Field(..., ge=1)
    repository: RepositoryScope
    requested_by: int = Field(..., ge=1)
    correlation_id: str = Field(..., min_length=8, max_length=128)
    rules: List[str] = Field(default_factory=list, max_length=30)
    architecture_profile: Optional[ArchitectureProfile] = None
    change_request: Optional[ChangeRequest] = None
    approved_findings: List[ApprovedFinding] = Field(default_factory=list, max_length=100)
    context: Dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    agent: AgentName
    status: AgentStatus
    summary: str = Field(..., min_length=1, max_length=12000)
    findings: List[AgentFinding] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    model_trace: Optional[ModelTrace] = None
    architecture: Optional[ArchitectureBlueprint] = None
    impact: Optional[ImpactAssessment] = None
    documentation: Optional[GeneratedDocumentation] = None
    todo_proposals: List[TodoProposal] = Field(default_factory=list)
    duration_ms: Optional[int] = Field(default=None, ge=0)
