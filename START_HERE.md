# Engineering Copilot — Full Stack (Sprint 2)

Ce paquet contient **les deux moitiés** du projet. L'intégration IA du Sprint 2
relie les deux : sans le service IA (FastAPI), l'assistant ne peut pas répondre.

```
engineering-copilot/
├── engineering-copilot-ai-sae/    ← SAE : Frontend React + Backend Spring Boot (contient l'intégration)
└── engineering-copilot-ai-main/   ← IA  : "AI backend" = microservice FastAPI (RAG, Qdrant, OpenAI)
```

## Les 4 services et leurs ports

| Service | Rôle | Port | Dossier |
| --- | --- | --- | --- |
| **Frontend React** | Interface (page Assistant) | `5173` | `engineering-copilot-ai-sae/frontend` |
| **Backend Spring Boot** | API métier + appel de l'IA | `8081` | `engineering-copilot-ai-sae` |
| **AI backend (FastAPI)** | RAG (embeddings, Qdrant, génération) | `8000` | `engineering-copilot-ai-main` |
| **Qdrant + PostgreSQL** | Index vectoriel + données métier | `6333` / `5432` | `engineering-copilot-ai-sae/docker-compose.yml` |

Chaîne d'appel :

```text
React (5173)  →  Spring Boot (8081)  →  FastAPI (8000)  →  Qdrant / OpenAI
```

> ⚠️ **Le "AI backend" est le dossier `engineering-copilot-ai-main` (FastAPI).**
> Il ne fait PAS partie du dossier SAE : c'est un microservice séparé qui doit
> tourner sur le port `8000`. Si on ne le lance pas, l'assistant renverra une
> erreur **503 "AI service unavailable"** — ce qui est le comportement attendu.

## Ce qui est déjà configuré et validé

**Pré-configuré dans ce paquet :**
- `engineering-copilot-ai-main/.env` — créé, tout est rempli **sauf la clé OpenAI**
  (`OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY` → à remplacer).
- `engineering-copilot-ai-sae/frontend/.env` — créé (`VITE_API_BASE_URL=http://localhost:8081`).
- `check-services.ps1` — script de test de santé des 4 services.

**Déjà validé avant livraison :**
- ✅ Frontend : `npm run build` (TypeScript + Vite) compile sans erreur.
- ✅ AI backend : dépendances installées, l'application **démarre** et `GET /health` répond `{"status":"ok"}`.
- ✅ AI backend : la route `POST /api/v1/rag/ask-simple` (appelée par Spring Boot) existe et
  **valide son contrat** (question absente ou < 3 caractères → HTTP 422).
- ✅ **Bout en bout RÉEL** avec les vraies clés (OpenAI + Qdrant Cloud) : `ask-simple` a
  renvoyé une **réponse française sourcée** (5 chunks, reranker CrossEncoder, pages citées de
  `spring-boot-reference.pdf`). `GET /api/v1/rag/health` → `collection_exists: true`, 800 points.
- ⏳ Reste à faire par le testeur : compiler/lancer le backend **Spring Boot** (JDK 17 requis —
  non disponible dans l'environnement de préparation) via `./mvnw spring-boot:run`.

> ℹ️ Remarque sur le `.env` : `ask-simple` utilise la collection
> `exp_openai_text_embedding_3_small` (existe, 800 points) et l'embedding OpenAI.
> Les valeurs `QDRANT_COLLECTION=engineering_copilot` et `EMBEDDING_PROVIDER=huggingface`
> ne sont **pas** utilisées par cette route (la collection `engineering_copilot` n'existe pas
> côté Qdrant) — c'est sans effet sur l'assistant du Sprint 2.

Après avoir démarré les services, lancer le test de santé :
```powershell
powershell -ExecutionPolicy Bypass -File .\check-services.ps1
```

## Ordre de démarrage

### 1) Dépendances (Qdrant + PostgreSQL)
```bash
cd engineering-copilot-ai-sae
docker compose up -d
```

### 2) AI backend — FastAPI (port 8000)
```powershell
cd engineering-copilot-ai-main
python -m venv venv ; .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env      # renseigner OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Vérifier : http://localhost:8000/health → `{"status":"ok"}`
Vérifier la collection : http://localhost:8000/api/v1/rag/health → `collection_exists: true`

> La collection Qdrant `exp_openai_text_embedding_3_small` doit exister.
> Si elle est vide, l'indexer avec les scripts de `engineering-copilot-ai-main/experiments/`
> (voir le README de ce dossier), ou pointer `QDRANT_URL` vers l'instance Qdrant
> déjà peuplée de l'équipe IA.

### 3) Backend Spring Boot (port 8081)
```bash
cd engineering-copilot-ai-sae
./mvnw spring-boot:run          # Windows : mvnw.cmd spring-boot:run
```
Compte admin par défaut : `admin@copilote.dev` / `Admin12345!`

### 4) Frontend React (port 5173)
```bash
cd engineering-copilot-ai-sae/frontend
npm install
npm run dev
```
Se connecter → ouvrir **Assistant** dans la barre latérale (rôle ADMIN ou DEVELOPER).

## Où est l'intégration (Sprint 2) ?

Tout est dans `engineering-copilot-ai-sae` :

- **Backend** : `client/AiRagClient.java`, `controller/AssistantController.java`,
  `config/AiClientConfig.java`, `config/AiProperties.java`, `service/impl/AssistantServiceImpl.java`,
  `dto/ai/*`, `dto/Response/AssistantAnswerResponse.java`.
- **Frontend** : `frontend/src/pages/AssistantPage.tsx`, `services/assistantService.ts`, `types/assistant.ts`.
- **Doc** : `engineering-copilot-ai-sae/README.md` et `engineering-copilot-ai-sae/docs/`
  (`ARCHITECTURE.md`, `INTEGRATION_IA.md`, `SPRINT2.md`).

## Prérequis

- Java 17+, Node 18+, Python 3.11/3.12, Docker.
- Une **clé OpenAI** et un **Qdrant** accessible (local via Docker, ou cloud de l'équipe).
