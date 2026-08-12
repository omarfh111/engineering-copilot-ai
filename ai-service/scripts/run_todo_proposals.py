"""Turn human-approved agent findings into TODO proposals without writing a database."""

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.agents.todo_agent import TodoAgent
from app.schemas.agents import AgentInput


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate TODO proposals from human-approved findings")
    parser.add_argument("--findings-file", required=True, help="JSON array of ApprovedFinding objects")
    parser.add_argument("--project-id", default=1, type=int)
    args = parser.parse_args()
    findings_path = Path(args.findings_file)
    if not findings_path.is_absolute():
        findings_path = PROJECT_ROOT / findings_path
    approved_findings = json.loads(findings_path.read_text(encoding="utf-8"))
    request = AgentInput(
        analysis_id=1,
        project_id=args.project_id,
        requested_by=1,
        correlation_id="manual-todo-proposals",
        repository={"url": "https://github.com/example/approved-findings", "branch": "main"},
        approved_findings=approved_findings,
    )
    result = TodoAgent().run(request)
    print(f"[todo] {result.status.value}")
    print(result.summary)
    for proposal in result.todo_proposals:
        location = f" ({proposal.location.path}:{proposal.location.line_start})" if proposal.location and proposal.location.path else ""
        print(f"- {proposal.priority.value}: {proposal.title}{location}")


if __name__ == "__main__":
    main()
