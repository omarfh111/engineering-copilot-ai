"""Configuration defaults must make the deterministic test suite self-contained."""

from app.core.config import Settings


def test_settings_have_safe_local_defaults_without_env_file():
    settings = Settings(_env_file=None)

    assert settings.APP_ENV == "development"
    assert settings.OPENAI_API_KEY == ""
    assert settings.GITHUB_TOKEN == ""
    assert settings.QDRANT_URL == "http://localhost:6333"
    assert settings.CHUNK_SIZE > settings.CHUNK_OVERLAP
