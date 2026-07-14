"""Internal authentication shared by the SAE-to-IA routes."""

import secrets
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_internal_api_key(
    x_internal_api_key: Optional[str] = Header(default=None),
) -> None:
    """Allow only the Spring Boot backend to call protected IA operations.

    FastAPI is an internal microservice.  Leaving RAG and ingestion routes open
    would expose document contents, Qdrant searches and paid model calls.
    """

    configured_key = settings.AI_INTERNAL_API_KEY
    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI internal API key is not configured",
        )

    if not x_internal_api_key or not secrets.compare_digest(
        x_internal_api_key, configured_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
