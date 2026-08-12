from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ===============================
    # Application
    # ===============================
    APP_NAME: str = "Engineering Copilot AI"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    FRONTEND_URL: str = "http://localhost:5173"

    # ===============================
    # LangSmith
    # ===============================
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "engineering-copilot-rag"
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"

    # ===============================
    # Providers
    # ===============================
    LLM_PROVIDER: str = "openai"
    VECTOR_DB: str = "qdrant"
    GIT_PROVIDER: str = "github"

    # ===============================
    # OpenAI
    # ===============================
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TEMPERATURE: float = 0.2

    # ===============================
    # Ollama
    # ===============================
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3-embedding:8b"

    # ===============================
    # Embeddings
    # ===============================
    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    HUGGINGFACE_API_KEY: str = ""

    # ===============================
    # PostgreSQL
    # ===============================
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "engineering_copilot"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # ===============================
    # Qdrant
    # ===============================
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "exp_openai_text_embedding_3_small"
    VECTOR_COLLECTION: str = "exp_openai_text_embedding_3_small"

    # ===============================
    # SAE <-> IA microservice contract
    # ===============================
    AI_INTERNAL_API_KEY: str = ""
    DOCUMENT_UPLOAD_DIR: str = "./data/uploads"
    MAX_DOCUMENT_UPLOAD_BYTES: int = 10_485_760
    DOCUMENT_COLLECTION: str = "documents_openai_text_embedding_3_small"

    # ===============================
    # Query transformation (optional RAG retrieval enhancements)
    # ===============================
    QUERY_REWRITE_ENABLED: bool = False
    QUERY_EXPANSION_ENABLED: bool = False
    QUERY_EXPANSION_VARIANTS: int = 3
    QUERY_RRF_K: int = 60
    HIERARCHICAL_RETRIEVAL_ENABLED: bool = False

    # ===============================
    # GitHub
    # ===============================
    GITHUB_TOKEN: str = ""
    GITHUB_API_BASE_URL: str = "https://api.github.com"
    REPOSITORY_MAX_FILES: int = 2_000
    REPOSITORY_MAX_FILE_BYTES: int = 1_000_000
    REPOSITORY_ANALYSIS_MAX_TOTAL_BYTES: int = 2_000_000

    # ===============================
    # AI Settings
    # ===============================
    TOP_K: int = 10
    MAX_CONTEXT_DOCUMENTS: int = 5
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
