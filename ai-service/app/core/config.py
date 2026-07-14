from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ===============================
    # Application
    # ===============================
    APP_NAME: str
    APP_ENV: str
    APP_HOST: str
    APP_PORT: int

    DEBUG: bool
    LOG_LEVEL: str
    FRONTEND_URL: str

    # ===============================
    # LangSmith
    # ===============================
    LANGCHAIN_TRACING_V2: bool
    LANGCHAIN_API_KEY: str
    LANGCHAIN_PROJECT: str
    LANGCHAIN_ENDPOINT: str

    # ===============================
    # Providers
    # ===============================
    LLM_PROVIDER: str
    VECTOR_DB: str
    GIT_PROVIDER: str

    # ===============================
    # OpenAI
    # ===============================
    OPENAI_API_KEY: str
    OPENAI_MODEL: str
    OPENAI_TEMPERATURE: float

    # ===============================
    # Ollama
    # ===============================
    OLLAMA_HOST: str
    OLLAMA_MODEL: str

    # ===============================
    # Embeddings
    # ===============================
    EMBEDDING_PROVIDER: str
    EMBEDDING_MODEL: str
    HUGGINGFACE_API_KEY: str

    # ===============================
    # PostgreSQL
    # ===============================
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    # ===============================
    # Qdrant
    # ===============================
    QDRANT_URL: str
    QDRANT_API_KEY: str
    QDRANT_COLLECTION: str
    VECTOR_COLLECTION: str

    # ===============================
    # GitHub
    # ===============================
    GITHUB_TOKEN: str

    # ===============================
    # AI Settings
    # ===============================
    TOP_K: int
    MAX_CONTEXT_DOCUMENTS: int
    CHUNK_SIZE: int
    CHUNK_OVERLAP: int

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()