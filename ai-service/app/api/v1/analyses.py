"""Protected internal endpoint for deterministic Sprint 3 repository analysis."""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.security import require_internal_api_key
from app.core.logging import logger
from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import (
    AgentInput,
    AgentName,
    AgentResult,
    ArchitectureProfile,
    ChangeRequest,
    ApprovedFinding,
    RepositoryScope,
)


router = APIRouter(prefix="/analyses", tags=["Analyses"])


class InternalAnalysisRequest(BaseModel):
    """Server-to-server payload; Spring owns authorization and persistence."""

    analysis_id: int = Field(..., ge=1)
    project_id: int = Field(..., ge=1)
    requested_by: int = Field(..., ge=1)
    correlation_id: str = Field(..., min_length=8, max_length=128)
    repository: RepositoryScope
    rules: List[str] = Field(default_factory=list, max_length=30)
    architecture_profile: ArchitectureProfile | None = None
    generate_documentation: bool = False
    change_description: str | None = Field(default=None, min_length=5, max_length=4000)
    change_paths: List[str] = Field(default_factory=list, max_length=50)


class InternalAnalysisResponse(BaseModel):
    analysis_id: int
    project_id: int
    correlation_id: str
    results: Dict[AgentName, AgentResult]


class InternalTodoProposalRequest(BaseModel):
    analysis_id: int = Field(..., ge=1)
    project_id: int = Field(..., ge=1)
    requested_by: int = Field(..., ge=1)
    correlation_id: str = Field(..., min_length=8, max_length=128)
    repository: RepositoryScope
    approved_findings: List[ApprovedFinding] = Field(..., min_length=1, max_length=100)


@router.post(
    "/run",
    response_model=InternalAnalysisResponse,
    dependencies=[Depends(require_internal_api_key)],
)
def run_analysis(request: InternalAnalysisRequest):
    """Run only the read-only agents currently implemented in Sprint 3.

    The route deliberately neither writes a TODO nor persists an Analysis. Spring
    Boot remains the source of truth for authorization, jobs and database state.
    """
    try:
        agent_input = AgentInput(
                analysis_id=request.analysis_id,
                project_id=request.project_id,
                requested_by=request.requested_by,
                correlation_id=request.correlation_id,
                repository=request.repository,
                rules=request.rules,
                architecture_profile=request.architecture_profile,
                change_request=(ChangeRequest(
                    description=request.change_description,
                    paths=request.change_paths,
                ) if request.change_description else None),
            )
        orchestrator = AnalysisOrchestrator()
        # Impact is deliberately on-demand: do not spend tokens or launch the
        # full audit graph when the caller only asks for a change scope.
        result = (orchestrator.run_impact_analysis(agent_input)
                  if request.change_description
                  else orchestrator.run_full_analysis(agent_input))
        if request.generate_documentation:
            result.update(orchestrator.run_documentation_analysis(agent_input))
        return InternalAnalysisResponse(
            analysis_id=request.analysis_id,
            project_id=request.project_id,
            correlation_id=request.correlation_id,
            results=result,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.exception(
            "Sprint 3 analysis failed | analysisId=%s projectId=%s correlationId=%s error=%s",
            request.analysis_id,
            request.project_id,
            request.correlation_id,
            type(error).__name__,
        )
        raise HTTPException(status_code=500, detail="Repository analysis failed")


@router.post("/todo-proposals", response_model=InternalAnalysisResponse,
             dependencies=[Depends(require_internal_api_key)])
def generate_todo_proposals(request: InternalTodoProposalRequest):
    """Generate proposals from accepted findings only; PostgreSQL remains Spring-owned."""
    result = AnalysisOrchestrator().run_todo_proposal_generation(AgentInput(
        analysis_id=request.analysis_id, project_id=request.project_id,
        requested_by=request.requested_by, correlation_id=request.correlation_id,
        repository=request.repository, approved_findings=request.approved_findings,
    ))
    return InternalAnalysisResponse(analysis_id=request.analysis_id, project_id=request.project_id,
                                    correlation_id=request.correlation_id, results=result)
