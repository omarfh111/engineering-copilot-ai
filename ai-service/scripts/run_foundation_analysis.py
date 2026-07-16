"""Run the first two Sprint 3 agents against one public GitHub repository.

Example:
    python scripts/run_foundation_analysis.py --url https://github.com/owner/repository --branch main
"""

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.orchestrator.orchestrator import AnalysisOrchestrator
from app.schemas.agents import AgentInput


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Structure and Context agents safely")
    parser.add_argument("--url", required=True, help="Public HTTPS GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Branch to inspect")
    parser.add_argument("--project-id", default=1, type=int, help="Temporary project scope for the test")
    args = parser.parse_args()

    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-foundation-analysis",
        repository={"url": args.url, "branch": args.branch},
    )
    results = AnalysisOrchestrator().run_foundation_analysis(request)
    for name, result in sorted(results.items(), key=lambda item: item[0].value):
        print(f"\n[{name.value}] {result.status.value}")
        print(result.summary)
        for finding in result.findings:
            print(f"- {finding.severity.value}: {finding.title}")


if __name__ == "__main__":
    main()
