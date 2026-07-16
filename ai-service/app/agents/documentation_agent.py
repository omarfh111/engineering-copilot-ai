"""Deterministic technical-documentation generation for Sprint 3."""

from collections import Counter

from app.agents.base import BaseAgent
from app.schemas.agents import (
    AgentFinding,
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    FindingSeverity,
    FindingSource,
    GeneratedDocumentation,
)
from app.services.github_service import GitHubRepositoryService


class DocumentationAgent(BaseAgent):
    """Builds a Markdown technical inventory from repository evidence only."""

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
        extension_counts = Counter(
            "." + path.rsplit(".", 1)[-1].casefold()
            for path in paths if "." in path
        )
        source_paths = self._source_paths(paths, readme_path)
        documentation = GeneratedDocumentation(
            title=f"Documentation technique — {snapshot.owner}/{snapshot.name}",
            markdown=self._markdown(snapshot, top_directories, extension_counts, source_paths),
            source_paths=source_paths,
        )
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"Fiche technique générée à partir de {len(source_paths)} source(s) documentaire(s) "
                f"et {len(paths)} fichier(s) du commit {snapshot.commit_sha[:12]}."
            ),
            findings=[],
            documentation=documentation,
        )

    @staticmethod
    def _readme(texts: dict[str, str]) -> tuple[str | None, str]:
        for path, text in texts.items():
            if path.rsplit("/", 1)[-1].casefold() in {"readme.md", "readme.mdx"}:
                return path, text
        return None, ""

    def _source_paths(self, paths: list[str], readme_path: str | None) -> list[str]:
        manifests = [
            path for path in paths
            if path.rsplit("/", 1)[-1].casefold() in self.EVIDENCE_FILENAMES
        ]
        entrypoints = [
            path for path in paths
            if path.rsplit("/", 1)[-1].casefold() in {"main.py", "app.py", "application.java"}
        ]
        documents = [path for path in paths if path.casefold().startswith("docs/")]
        sources = manifests + entrypoints + documents
        if readme_path:
            sources.append(readme_path)
        return list(dict.fromkeys(sources))[:100]

    @staticmethod
    def _markdown(snapshot, top_directories, extension_counts, source_paths) -> str:
        extensions = ", ".join(
            f"{extension} ({count})" for extension, count in extension_counts.most_common(12)
        ) or "non déterminées"
        lines = [
            f"# Documentation technique — {snapshot.owner}/{snapshot.name}",
            "",
            "## Périmètre analysé",
            "",
            f"- Branche : `{snapshot.branch}`",
            f"- Commit : `{snapshot.commit_sha}`",
            f"- Fichiers autorisés analysés : {len(snapshot.files)}",
            "",
            "## Structure observée",
            "",
            f"- Répertoires principaux : {', '.join(top_directories) or 'aucun'}",
            f"- Extensions principales : {extensions}",
            "",
            "## Sources de preuve",
            "",
        ]
        lines.extend(f"- `{path}`" for path in source_paths) if source_paths else lines.append("- Aucun manifest ou point d'entrée reconnu ; la structure reste la source de preuve.")
        lines.extend([
            "",
            "## Exploitation à compléter",
            "",
            "Les commandes exactes de démarrage, les variables d'environnement et les procédures de déploiement doivent être validées par le responsable du projet avant publication.",
            "",
            "## Notes sur le README",
            "",
        ])
        lines.append("Le README, s'il est présent, est cité comme source complémentaire. Son absence n'empêche pas la génération de cette fiche.")
        lines.extend([
            "",
            "## Limites",
            "",
            "Cette fiche est générée à partir des métadonnées et textes autorisés du dépôt. Elle ne remplace pas une revue humaine ni une documentation d'exploitation validée.",
        ])
        return "\n".join(lines) + "\n"
