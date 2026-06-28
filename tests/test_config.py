from app.core.config import settings

print("=" * 40)
print("Engineering Copilot Configuration")
print("=" * 40)

print(f"Application : {settings.APP_NAME}")
print(f"Environment : {settings.APP_ENV}")
print(f"OpenAI Model : {settings.OPENAI_MODEL}")
print(f"LLM Provider : {settings.LLM_PROVIDER}")
print(f"Embedding : {settings.EMBEDDING_MODEL}")
print(f"Vector DB : {settings.VECTOR_DB}")
print(f"Git Provider : {settings.GIT_PROVIDER}")
print(f"Chunk Size : {settings.CHUNK_SIZE}")
print(f"Top K : {settings.TOP_K}")

print("=" * 40)
print("Configuration loaded successfully ✅")