"""Generate a sourced technical-documentation Markdown report for a public repository."""

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import AgentInput


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Sprint 3 documentation agent safely")
    parser.add_argument("--url", required=True, help="Public HTTPS GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Branch to inspect")
    parser.add_argument("--project-id", default=1, type=int, help="Project scope for the audit")
    parser.add_argument("--output", default="experiments/results/generated_technical_documentation.md")
    args = parser.parse_args()
    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-documentation-analysis",
        repository={"url": args.url, "branch": args.branch},
    )
    result = AnalysisOrchestrator().run_documentation_analysis(request)["documentation"]
    print(f"[documentation] {result.status.value}")
    print(result.summary)
    for finding in result.findings:
        print(f"- {finding.severity.value}: {finding.title}")
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = PROJECT_ROOT / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result.documentation.markdown, encoding="utf-8")
    print(f"Documentation Markdown générée : {output_path}")


if __name__ == "__main__":
    main()
