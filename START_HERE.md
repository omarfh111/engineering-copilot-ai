# Démarrage rapide - Engineering Copilot

La structure est un monorepo technique : les noms ne dépendent plus de la répartition des tâches du binôme.

```text
frontend/    React + Vite
backend/     Spring Boot, API métier, PostgreSQL et sécurité
ai-service/  FastAPI, ingestion, embeddings, RAG et Qdrant
infra/       Docker Compose pour PostgreSQL et Qdrant
docs/        Validation Sprint 2 et backlog Sprint 3
```

## Ordre de démarrage

1. Créer `backend/.env` depuis `backend/.env.example`.
2. Créer `ai-service/.env` depuis `ai-service/.env.example`.
3. Définir exactement la même valeur `AI_INTERNAL_API_KEY` dans les deux fichiers.
4. Depuis la racine : `docker compose -f infra/docker-compose.yml up -d`.
5. Depuis `ai-service` : installer les dépendances Python, puis lancer `python -m uvicorn app.main:app --reload --port 8000`.
6. Depuis `backend` : avec Java 17+, lancer `./mvnw spring-boot:run` (Windows : `mvnw.cmd spring-boot:run`).
7. Depuis `frontend` : `npm install`, puis `npm run dev`.

Les services utilisent les ports React `5173`, Spring Boot `8081`, FastAPI `8000`, PostgreSQL `5432` et Qdrant `6333`.

Voir le [README principal](README.md), le [contrat backend-IA](backend/docs/ROUTAGE_SAE_IA.md) et les [critères Sprint 2](docs/SPRINT2_ACCEPTANCE.md).
