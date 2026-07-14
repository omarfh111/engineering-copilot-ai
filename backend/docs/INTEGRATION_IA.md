# Intégration SAE ↔ IA — contrat côté backend

Ce document décrit, côté **SAE (Spring Boot)**, l'intégration au microservice
**FastAPI IA**. Il est le pendant, côté client, du document
`docs/ROUTAGE_SAE_IA.md` fourni dans le dépôt `engineering-copilot-ai-main`.

## 1. Frontière et principe

```text
React  →  Spring Boot (/api/assistant/**)  →  FastAPI (/api/v1/rag/ask-simple)  →  Qdrant / OpenAI
```

- Spring Boot **authentifie**, applique le **RBAC** puis appelle l'IA **côté serveur**.
- Le frontend **n'appelle jamais** FastAPI directement.
- Le préfixe `/api/assistant/**` est déjà restreint à `ADMIN`/`DEVELOPER` dans
  `SecurityConfig` : aucune modification de la configuration de sécurité n'a été
  nécessaire.

## 2. Composants ajoutés

| Fichier | Rôle |
| --- | --- |
| `config/AiProperties.java` | Lie `ai.service.*` (base-url, timeouts). URL lue depuis `AI_SERVICE_BASE_URL`. |
| `config/AiClientConfig.java` | Bean `RestClient` nommé `aiRestClient` (base URL + timeouts). |
| `client/AiRagClient.java` | Appel `POST /api/v1/rag/ask-simple` et `GET /health`, retry + traduction d'erreurs. |
| `dto/ai/AiAskSimpleRequest.java` | Corps envoyé à l'IA `{ question }`. |
| `dto/ai/AiAskResponse.java` / `AiSourceResponse.java` | Réponse IA en **snake_case** (`@JsonProperty`). |
| `dto/Request/AssistantAskRequest.java` | Requête publique validée (`question` ≥ 3 car.). |
| `dto/Response/AssistantAnswerResponse.java` / `AssistantSourceResponse.java` | **DTO public** (camelCase) renvoyé au frontend. |
| `service/AssistantService(Impl).java` | Latence, audit, score de confiance, mapping. |
| `controller/AssistantController.java` | `POST /api/assistant/ask`, `GET /api/assistant/health`. |
| `exception/AiServiceUnavailableException.java` | Mappée en **HTTP 503** par `GlobalExceptionHandler`. |

## 3. Configuration

```properties
ai.service.base-url=${AI_SERVICE_BASE_URL:http://localhost:8000}
ai.service.connect-timeout=5s
ai.service.response-timeout=90s
```

- **connect-timeout court** (5 s) : appel serveur-à-serveur.
- **response-timeout généreux** (90 s) : couvre le chargement paresseux du
  CrossEncoder et une génération complète.

## 4. Contrat de la route `POST /api/assistant/ask`

### Requête
```json
{ "question": "Quelles protections recommande OWASP pour les API ?" }
```
Règles : `question` obligatoire, **≥ 3 caractères** (sinon `400`).
Le champ optionnel `projectId` est **réservé** (RAG par projet / persistance
au Sprint 3) et n'est pas encore utilisé.

### Réponse `200 OK`
```json
{
  "question": "…",
  "answer": "…",
  "sources": [
    { "source": "security/owasp-api-security-top-10.pdf",
      "displayName": "owasp-api-security-top-10.pdf",
      "pageNumber": 12, "score": 0.68, "chunkId": "…" }
  ],
  "confidence": 0.68,
  "chunksUsed": 5,
  "responseTimeMs": 1720,
  "collectionName": "exp_openai_text_embedding_3_small",
  "framework": "langchain",
  "rerankerType": "cross_encoder"
}
```

### Mapping IA → public

| Champ IA (snake_case) | Champ public (camelCase) | Note |
| --- | --- | --- |
| `answer` | `answer` | — |
| `sources[].source` | `sources[].source` + `displayName` | `displayName` = nom de fichier |
| `sources[].page_number` | `sources[].pageNumber` | nullable |
| `sources[].score` | `sources[].score` | nullable |
| `sources[].embedding_score` | *(agrégé)* `confidence` | max borné à `[0,1]` |
| `sources[].rerank_score` | *(ignoré)* | non borné, peut être négatif |
| `chunks_used` | `chunksUsed` | — |
| *(mesuré côté SAE)* | `responseTimeMs` | latence de l'appel IA |

> **Score de confiance** : basé sur le **meilleur score d'embedding (cosinus)**.
> Les scores du CrossEncoder ne sont pas convertis en confiance car seul leur
> **ordre** est significatif (ils peuvent être négatifs).

## 5. Gestion des erreurs

| Situation IA | Traitement SAE | Statut renvoyé au frontend |
| --- | --- | --- |
| `400` / `422` (question invalide) | `IllegalArgumentException` | **400** (pas de retry) |
| Erreur réseau / timeout | `AiServiceUnavailableException` | **503** |
| `500` de l'IA | `AiServiceUnavailableException` (pas de retry) | **503** |
| `502` / `503` de l'IA | **1 retry** puis `AiServiceUnavailableException` | **503** |

Politique de retry (conforme au handoff IA) : **au plus un retry**, uniquement
sur erreur réseau ou `502/503`. Jamais de retry sur `400/422/500`.

Les erreurs sont renvoyées via le format standard `ErrorResponse`
(`timestamp`, `status`, `error`, `message`, `path`) — aucun détail interne de
l'IA n'est exposé.

## 6. Health check

`GET /api/assistant/health` → `{ "status": "ok"|"unavailable", "aiService": true|false }`
(proxy non-bloquant du `GET /health` de l'IA).

## 7. Sécurité

- Authentification **JWT** exigée ; rôles `ADMIN`/`DEVELOPER` uniquement.
- Les clés OpenAI/Qdrant restent **côté IA** ; le SAE ne les manipule jamais.
- En production : placer FastAPI sur un réseau privé et ajouter un secret
  service-à-service (Sprint ultérieur).

## 8. Écarts connus / à améliorer

- Le RAG répond sur le **corpus documentaire partagé**, pas encore par projet.
- Les échanges ne sont pas systématiquement persistés en `Conversation`
  (possible via l'endpoint existant `/api/conversations`).
- **Ingestion à venir** : la création d'un document déclenchera
  `POST /api/v1/documents/ingest-path` (embeddings + indexation) — Sprint 3.
