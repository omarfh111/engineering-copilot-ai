# Démarrage rapide — Engineering Copilot

Le dépôt est un monorepo : `frontend/` (React), `backend/` (Spring Boot), `ai-service/` (FastAPI) et `infra/` (PostgreSQL, Qdrant, Mailpit).

## Prérequis

- Java 21, Python 3.12, Node.js 22 et Docker Desktop.
- Une clé OpenAI seulement pour les opérations IA qui sollicitent un modèle externe.

## Lancer le projet

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item ai-service/.env.example ai-service/.env
Copy-Item frontend/.env.example frontend/.env
docker compose -f infra/docker-compose.yml up -d
```

Renseigner les variables dans les fichiers `.env`, notamment une même valeur `AI_INTERNAL_API_KEY` côté backend et service IA. Puis lancer les trois applications dans des terminaux séparés :

```powershell
cd ai-service; python -m pip install -r requirements.txt; python -m uvicorn app.main:app --reload --port 8000
cd backend; .\mvnw.cmd spring-boot:run
cd frontend; npm ci; npm run dev
```

Consulter le [README](README.md) pour l'architecture, les tests, la sécurité et le processus de livraison, puis l'[audit Sprint 4](docs/FINALIZATION_AUDIT.md) avant une fusion dans `main`.
