import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# On Windows, corporate certificates are often installed in the OS trust
# store instead of certifi's static bundle. Injecting truststore preserves TLS
# verification while allowing Qdrant/OpenAI HTTPS calls through that trust
# chain. It is optional on other platforms and in minimal test environments.
if os.name == "nt":
    try:
        import truststore

        truststore.inject_into_ssl()
    except ImportError:
        pass

from app.api.v1.documents import router as documents_router
from app.api.v1.analyses import router as analyses_router
from app.api.v1.rag import router as rag_router


app = FastAPI(
    title="Engineering Copilot AI API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Engineering Copilot AI API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }

app.include_router(
    documents_router,
    prefix="/api/v1",
)
app.include_router(
    rag_router,
    prefix="/api/v1",
)
app.include_router(
    analyses_router,
    prefix="/api/v1",
)
