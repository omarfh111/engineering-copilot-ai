"""Human-approved TODO proposal generation for Sprint 3."""

from app.agents.base import BaseAgent
from app.schemas.agents import (
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingSeverity,
    TodoProposal,
)


class TodoAgent(BaseAgent):
    """Transforms approved findings into proposals; it never writes PostgreSQL TODOs."""

    name = AgentName.TODO

    def run(self, request: AgentInput) -> AgentResult:
        if not request.approved_findings:
            return AgentResult(
                agent=self.name,
                status=AgentStatus.PARTIAL,
                summary="Aucune proposition TODO : des constats doivent d'abord être validés par un humain.",
            )
        proposals = [self._proposal(approved.agent, approved.finding) for approved in request.approved_findings]
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"{len(proposals)} proposition(s) TODO générée(s) à partir de constats validés ; "
                "aucune tâche métier n'a été créée automatiquement."
            ),
            todo_proposals=proposals,
        )

    @staticmethod
    def _proposal(origin_agent: AgentName, finding) -> TodoProposal:
        location = ""
        if finding.location and finding.location.path:
            location = f" ({finding.location.path}:{finding.location.line_start or 1})"
        return TodoProposal(
            title=f"[{origin_agent.value.upper()}] {finding.title}",
            description=(
                f"Preuve : {finding.evidence}\n\n"
                f"Action recommandée : {finding.recommendation or 'À définir pendant la revue.'}{location}"
            ),
            priority=finding.severity,
            origin_agent=origin_agent,
            location=finding.location,
            sources=finding.sources,
        )
