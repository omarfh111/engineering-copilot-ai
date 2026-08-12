"""Evidence-based technical-documentation generation for Sprint 3."""

from collections import Counter
import re

from app.agents.base import BaseAgent
from app.schemas.agents import AgentInput, AgentName, AgentResult, AgentStatus, GeneratedDocumentation
from app.services.github_service import GitHubRepositoryService


class DocumentationAgent(BaseAgent):
    """Creates a useful draft from repository evidence without inventing project facts."""

    name = AgentName.DOCUMENTATION
    SOURCE_EXTENSIONS = {".md", ".json", ".xml", ".properties", ".yml", ".yaml", ".py", ".java", ".js", ".jsx", ".ts", ".tsx"}
    EVIDENCE_FILENAMES = {
        "package.json", "pom.xml", "build.gradle", "build.gradle.kts", "requirements.txt",
        "pyproject.toml", "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    }

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        snapshot = self.repository_snapshot(request, self.repository_service)
        texts = self.repository_text_files(request, self.repository_service, self.SOURCE_EXTENSIONS)
        paths = sorted(item["path"] for item in snapshot.files)
        readme_path, _ = self._readme(texts)
        top_directories = sorted({path.split("/", 1)[0] for path in paths if "/" in path})
        extension_counts = Counter("." + path.rsplit(".", 1)[-1].casefold() for path in paths if "." in path)
        source_paths = self._source_paths(paths, readme_path)
        documentation = GeneratedDocumentation(
            title=f"Technical documentation - {snapshot.owner}/{snapshot.name}",
            markdown=self._markdown(
                snapshot=snapshot,
                top_directories=top_directories,
                extension_counts=extension_counts,
                source_paths=source_paths,
                technology=self._technology(paths, texts),
                entrypoints=self._entrypoints(paths),
                commands=self._commands(texts),
                environment_variables=self._environment_variables(texts),
                route_evidence=self._route_evidence(texts),
            ),
            source_paths=source_paths,
        )
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(f"Technical draft generated from {len(source_paths)} evidence source(s) "
                     f"and {len(paths)} allowed file(s) at commit {snapshot.commit_sha[:12]}"),
            documentation=documentation,
        )

    @staticmethod
    def _readme(texts: dict[str, str]) -> tuple[str | None, str]:
        for path, text in texts.items():
            if path.rsplit("/", 1)[-1].casefold() in {"readme.md", "readme.mdx"}:
                return path, text
        return None, ""

    def _source_paths(self, paths: list[str], readme_path: str | None) -> list[str]:
        manifests = [path for path in paths if path.rsplit("/", 1)[-1].casefold() in self.EVIDENCE_FILENAMES]
        entrypoints = [path for path in paths if path.rsplit("/", 1)[-1].casefold() in {"main.py", "app.py", "application.java"}]
        documentation = [path for path in paths if path.casefold().startswith("docs/")]
        sources = manifests + entrypoints + documentation
        if readme_path:
            sources.append(readme_path)
        return list(dict.fromkeys(sources))[:100]

    @staticmethod
    def _technology(paths: list[str], texts: dict[str, str]) -> list[str]:
        corpus = "\n".join(texts.values()).casefold()
        basenames = {path.rsplit("/", 1)[-1].casefold() for path in paths}
        checks = (
            ("React", "react" in corpus or any(path.endswith((".jsx", ".tsx")) for path in paths)),
            ("Vite", "vite" in corpus),
            ("Node.js", "package.json" in basenames),
            ("Python", any(path.endswith(".py") for path in paths)),
            ("FastAPI", "fastapi" in corpus),
            ("Flask", "flask" in corpus),
            ("Spring Boot", "spring-boot" in corpus),
            ("PostgreSQL", "postgres" in corpus),
            ("Docker", "docker" in corpus or any("docker" in path.casefold() for path in paths)),
        )
        return [label for label, present in checks if present]

    @staticmethod
    def _entrypoints(paths: list[str]) -> list[str]:
        conventional_names = {"main.py", "app.py", "manage.py", "server.js", "index.js", "index.ts", "application.java", "package.json", "pom.xml"}
        return [path for path in paths if path.rsplit("/", 1)[-1].casefold() in conventional_names][:20]

    @staticmethod
    def _commands(texts: dict[str, str]) -> list[str]:
        pattern = re.compile(r"(?m)^\s*(?:\$\s*)?((?:npm|pnpm|yarn|python(?:3)?|uvicorn|gunicorn|mvn|\.\\?mvnw|docker(?:\s+compose)?)\b[^\r\n`]{0,180})")
        commands = [match.group(1).strip() for text in texts.values() for match in pattern.finditer(text)]
        return list(dict.fromkeys(commands))[:12]

    @staticmethod
    def _environment_variables(texts: dict[str, str]) -> list[str]:
        pattern = re.compile(r"\b[A-Z][A-Z0-9_]{2,}\b")
        variables = []
        for path, text in texts.items():
            filename = path.rsplit("/", 1)[-1].casefold()
            if filename in {"readme.md", ".env.example", "example.env"} or ".env" in path.casefold() or "config" in path.casefold():
                variables.extend(pattern.findall(text))
        ignored = {"GET", "POST", "PUT", "DELETE", "JSON", "HTML", "HTTP", "API", "URL", "PDF", "DOCX", "SQL"}
        return [item for item in dict.fromkeys(variables) if item not in ignored][:30]

    @staticmethod
    def _route_evidence(texts: dict[str, str]) -> list[str]:
        tokens = ("@app.", "@router.", "@GetMapping", "@PostMapping", "@RequestMapping", "router.")
        return [path for path, text in texts.items() if any(token in text for token in tokens)][:20]

    @staticmethod
    def _markdown(snapshot, top_directories, extension_counts, source_paths, technology, entrypoints, commands, environment_variables, route_evidence) -> str:
        extensions = ", ".join(f"{extension} ({count})" for extension, count in extension_counts.most_common(12)) or "not detected"
        lines = [
            f"# Technical documentation - {snapshot.owner}/{snapshot.name}", "",
            "## Analysed scope", "",
            f"- Branch: `{snapshot.branch}`", f"- Commit: `{snapshot.commit_sha}`", f"- Allowed files analysed: {len(snapshot.files)}", "",
            "## Repository structure", "",
            f"- Main directories: {', '.join(top_directories) or 'none'}", f"- Main extensions: {extensions}", "",
            "## Detected technology", "",
            f"- {', '.join(technology) if technology else 'No technology could be identified from the allowed files.'}", "",
            "## Entry points and manifests", "",
        ]
        lines.extend(f"- `{path}`" for path in entrypoints) if entrypoints else lines.append("- No conventional entry point was detected.")
        lines.extend(["", "## Observed run commands", ""])
        lines.extend(f"- `{command}`" for command in commands) if commands else lines.append("- No executable command was found in the allowed documentation or configuration files.")
        lines.extend(["", "## Environment variables referenced", ""])
        lines.extend(f"- `{variable}`" for variable in environment_variables) if environment_variables else lines.append("- No environment variable was detected from the allowed configuration sources.")
        lines.extend(["", "## API route evidence", ""])
        lines.extend(f"- `{path}`" for path in route_evidence) if route_evidence else lines.append("- No backend route declaration was detected in the analysed files.")
        lines.extend(["", "## Evidence sources", ""])
        lines.extend(f"- `{path}`" for path in source_paths) if source_paths else lines.append("- No manifest or documentation source was recognised; the repository structure is the available evidence.")
        lines.extend(["", "## Review notes", "", "This draft is generated from repository evidence only. Commands, deployment procedures and secrets must be validated by the project owner before approval."])
        return "\n".join(lines) + "\n"
