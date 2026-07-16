"""Run deterministic Sprint 3 Quality and Security agents on a public repository.

The repository is read through GitHub's API at a fixed commit; it is never cloned
or executed. Example:
    python scripts/run_quality_security_analysis.py --url https://github.com/owner/repository --branch main --project-id 1
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
    parser = argparse.ArgumentParser(description="Run Sprint 3 quality and security agents safely")
    parser.add_argument("--url", required=True, help="Public HTTPS GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Branch to inspect")
    parser.add_argument("--project-id", default=1, type=int, help="Project scope for the audit")
    args = parser.parse_args()

    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-quality-security-analysis",
        repository={"url": args.url, "branch": args.branch},
    )
    results = AnalysisOrchestrator().run_quality_security_analysis(request)
    for name, result in sorted(results.items(), key=lambda item: item[0].value):
        print(f"\n[{name.value}] {result.status.value}")
        print(result.summary)
        for finding in result.findings:
            location = finding.location
            where = f" ({location.path}:{location.line_start})" if location and location.path else ""
            print(f"- {finding.severity.value}: {finding.title}{where}")


if __name__ == "__main__":
    main()
