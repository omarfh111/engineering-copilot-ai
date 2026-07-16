"""Run the on-demand Sprint 3 impact agent without changing a repository."""

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import AgentInput

RULESET_VERSION = "module-aware-v2"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a safe, on-demand impact analysis")
    parser.add_argument("--url", required=True, help="Public HTTPS GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Branch to inspect")
    parser.add_argument("--project-id", default=1, type=int, help="Project scope for the audit")
    parser.add_argument("--change", required=True, help="Description of the requested change or problem")
    parser.add_argument("--paths", default="", help="Comma-separated repository-relative paths")
    args = parser.parse_args()
    paths = [path.strip() for path in args.paths.split(",") if path.strip()]
    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-impact-analysis",
        repository={"url": args.url, "branch": args.branch},
        change_request={"description": args.change, "paths": paths},
    )
    result = AnalysisOrchestrator().run_impact_analysis(request)["impact"]
    print(f"[impact] {result.status.value}")
    print(f"Règles de correspondance des tests : {RULESET_VERSION}")
    print(result.summary)
    if result.impact:
        print(f"Fichiers impactés : {', '.join(result.impact.impacted_paths) or 'aucun'}")
        print(f"Tests suggérés : {', '.join(result.impact.suggested_test_paths) or 'aucun'}")
        print(f"Risques : {', '.join(result.impact.risk_areas) or 'aucun'}")
    for finding in result.findings:
        print(f"- {finding.severity.value}: {finding.title}")


if __name__ == "__main__":
    main()
