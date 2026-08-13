from pathlib import Path

from app.core.config import AI_SERVICE_DIR, DEFAULT_ENV_FILE, Settings


def test_default_env_file_is_anchored_to_ai_service_directory():
    assert DEFAULT_ENV_FILE == AI_SERVICE_DIR / ".env"
    assert DEFAULT_ENV_FILE.is_absolute()
    assert AI_SERVICE_DIR.name == "ai-service"


def test_settings_can_still_disable_env_file_for_isolated_tests():
    isolated = Settings(_env_file=None)

    assert isolated.QDRANT_URL == "http://localhost:6333"
