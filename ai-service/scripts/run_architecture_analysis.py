"""Run the deterministic Sprint 3 Architecture agent on a public repository."""

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import AgentInput


def build_markdown_report(result) -> str:
    """Render only structured, already-redacted agent output to Markdown."""
    architecture = result.architecture
    lines = [
        "# Rapport d'architecture généré",
        "",
        f"**Statut :** {result.status.value}",
        "",
        f"**Résumé :** {result.summary}",
        "",
        "## Architecture proposée",
        "",
        f"**Style :** {architecture.style}",
        "",
        "### Diagramme des composants",
        "",
        "```mermaid",
        architecture.mermaid_diagram,
        "```",
        "",
        "### Composants détectés",
        "",
        "| Composant | Type | Preuves |",
        "| --- | --- | --- |",
    ]
    for component in architecture.components:
        lines.append(
            f"| {component.name} | {component.component_type} | {', '.join(component.evidence_paths) or '-'} |"
        )
    lines.extend(["", "### Flux détectés", "", "| Source | Cible | Protocole | Preuve |", "| --- | --- | --- | --- |"])
    for flow in architecture.flows:
        lines.append(f"| {flow.source} | {flow.target} | {flow.protocol} | {flow.evidence} |")
    if architecture.compliance_checks:
        lines.extend(["", "## Conformité au profil sélectionné", "", "| ID | Exigence | État | Preuve | Recommandation |", "| --- | --- | --- | --- | --- |"])
        for check in architecture.compliance_checks:
            lines.append(
                f"| {check.requirement_id} | {check.requirement} | {check.status.value} | {check.evidence} | {check.recommendation or '-'} |"
            )
    lines.extend(["", "## Constats", ""])
    if result.findings:
        for finding in result.findings:
            lines.append(f"- **{finding.severity.value}** — {finding.title} : {finding.recommendation or finding.evidence}")
    else:
        lines.append("Aucun constat à signaler.")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Sprint 3 architecture agent safely")
    parser.add_argument("--url", required=True, help="Public HTTPS GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Branch to inspect")
    parser.add_argument("--project-id", default=1, type=int, help="Project scope for the audit")
    parser.add_argument(
        "--profile",
        choices=["engineering_copilot"],
        help="Optional target architecture used for compliance checks",
    )
    parser.add_argument(
        "--output",
        default="experiments/results/architecture_analysis_report.md",
        help="Markdown report path, relative to ai-service by default",
    )
    args = parser.parse_args()
    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-architecture-analysis",
        repository={"url": args.url, "branch": args.branch},
        architecture_profile=args.profile,
    )
    result = AnalysisOrchestrator().run_architecture_analysis(request)["architecture"]
    print(f"[architecture] {result.status.value}")
    print(result.summary)
    for finding in result.findings:
        print(f"- {finding.severity.value}: {finding.title}")
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = PROJECT_ROOT / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_markdown_report(result), encoding="utf-8")
    print(f"\nRapport Markdown généré : {output_path}")


if __name__ == "__main__":
    main()
