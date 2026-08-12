"""Read-only, bounded GitHub repository collection for Sprint 3 agents."""

import base64
import binascii
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple
from urllib.parse import urlparse

import requests

from app.core.config import settings


class RepositoryAccessError(ValueError):
    """Raised when a repository is outside the authorised MVP scope."""


@dataclass(frozen=True)
class RepositorySnapshot:
    owner: str
    name: str
    branch: str
    commit_sha: str
    files: List[Dict]


class GitHubRepositoryService:
    """Uses the GitHub API; it never clones or executes repository code."""

    ALLOWED_EXTENSIONS = {
        ".py", ".java", ".js", ".jsx", ".ts", ".tsx", ".md", ".json",
        ".yaml", ".yml", ".xml", ".properties", ".gradle", ".sql", ".html",
        ".css", ".sh",
    }
    EXCLUDED_DIRECTORIES = {
        ".git", ".venv", "venv", "node_modules", "vendor", "dist", "build",
        "target", "coverage", ".next", ".idea",
    }

    def __init__(self, session: requests.Session | None = None):
        self.session = session or requests.Session()
        self.base_url = settings.GITHUB_API_BASE_URL.rstrip("/")
        self.session.headers.update(
            {
                "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
                "Accept": "application/vnd.github+json",
            }
        )

    @staticmethod
    def parse_public_url(url: str) -> Tuple[str, str]:
        parsed = urlparse(url.strip())
        if parsed.scheme != "https" or parsed.hostname not in {"github.com", "www.github.com"}:
            raise RepositoryAccessError("Only public HTTPS GitHub repository URLs are supported")
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) != 2:
            raise RepositoryAccessError("Repository URL must use https://github.com/owner/repository")
        owner, repository = parts
        return owner, repository.removesuffix(".git")

    def inspect_public_repository(self, url: str, branch: str = "main") -> RepositorySnapshot:
        owner, name = self.parse_public_url(url)
        repository = self._get_json(f"/repos/{owner}/{name}")
        if repository.get("private"):
            raise RepositoryAccessError("Private repositories are outside the Sprint 3 MVP scope")
        ref = self._get_json(f"/repos/{owner}/{name}/commits/{branch}")
        commit_sha = ref["sha"]
        tree = self._get_json(f"/repos/{owner}/{name}/git/trees/{commit_sha}?recursive=1")
        if tree.get("truncated"):
            raise RepositoryAccessError("Repository tree exceeds GitHub's API response limit")

        files = [item for item in tree.get("tree", []) if self._is_allowed_file(item)]
        if len(files) > settings.REPOSITORY_MAX_FILES:
            raise RepositoryAccessError("Repository exceeds the configured file limit")
        return RepositorySnapshot(owner, name, branch, commit_sha, files)

    def read_allowed_text_files(
        self,
        snapshot: RepositorySnapshot,
        extensions: Iterable[str],
    ) -> Dict[str, str]:
        """Return a bounded, read-only source corpus for deterministic agents.

        GitHub blobs are fetched at the already resolved commit. Repository text is
        treated as untrusted data and is never logged, executed, or sent to a shell.
        """
        accepted_extensions = {extension.casefold() for extension in extensions}
        total_bytes = 0
        corpus: Dict[str, str] = {}
        for item in snapshot.files:
            path = item.get("path", "")
            suffix = "." + path.rsplit(".", 1)[-1].casefold() if "." in path else ""
            size = item.get("size", 0)
            if suffix not in accepted_extensions or size <= 0:
                continue
            if total_bytes + size > settings.REPOSITORY_ANALYSIS_MAX_TOTAL_BYTES:
                break
            blob_sha = item.get("sha")
            if not blob_sha:
                continue
            blob = self._get_json(f"/repos/{snapshot.owner}/{snapshot.name}/git/blobs/{blob_sha}")
            if blob.get("encoding") != "base64" or not isinstance(blob.get("content"), str):
                continue
            try:
                # GitHub wraps base64 blob content across lines; standard decoding
                # accepts this whitespace while still failing malformed payloads.
                content = base64.b64decode(blob["content"])
            except (ValueError, TypeError, binascii.Error):
                continue
            if len(content) > settings.REPOSITORY_MAX_FILE_BYTES:
                continue
            total_bytes += len(content)
            corpus[path] = content.decode("utf-8", errors="replace")
        return corpus

    def _get_json(self, path: str) -> Dict:
        response = self.session.get(f"{self.base_url}{path}", timeout=20)
        if response.status_code == 404:
            raise RepositoryAccessError("Repository or requested branch was not found")
        response.raise_for_status()
        return response.json()

    @classmethod
    def _is_allowed_file(cls, item: Dict) -> bool:
        if item.get("type") != "blob":
            return False
        path = item.get("path", "")
        path_parts = set(path.split("/"))
        if path_parts & cls.EXCLUDED_DIRECTORIES:
            return False
        if item.get("size", 0) > settings.REPOSITORY_MAX_FILE_BYTES:
            return False
        suffix = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""
        return suffix in cls.ALLOWED_EXTENSIONS
