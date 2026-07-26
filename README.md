# Engineering Copilot

Plateforme en cours de développement pour l'analyse, l'audit et la documentation de projets logiciels. Le dépôt rassemble les deux périmètres du binôme : le socle applicatif **SAE** et le microservice **IA**.

> Statut : Sprint 2 consolidé. Le socle Sprint 3 est intégré : audit multi-agents, revue humaine par finding, impact à la demande, proposition TODO via IA et publication contrôlée de feedback projet sont disponibles. Les écritures métier restent toujours explicites et confirmées par un humain.

## Architecture

```mermaid
flowchart LR
  U[Utilisateur] --> R[React - port 5173]
  R --> S[Spring Boot SAE - port 8081]
  S --> P[(PostgreSQL - port 5432)]
  S -- X-Internal-Api-Key --> I[FastAPI IA - port 8000]
  I --> Q[(Qdrant - port 6333)]
  I --> O[OpenAI]
```

Spring Boot est la seule API publique. React ne contacte jamais FastAPI. Pour un fichier envoyé lors de la création d'un document, React envoie le fichier à Spring, Spring le conserve puis transmet une copie multipart temporaire à FastAPI pour l'extraction, le chunking, les embeddings et l'indexation Qdrant.

## Organisation

```text
engineering-copilot-ai/
├── frontend/                     # React + Vite
├── backend/                      # Spring Boot + PostgreSQL métier
├── ai-service/                   # FastAPI, RAG, embeddings, Qdrant
├── infra/                        # Docker Compose et infrastructure locale
├── docs/                         # Architecture, acceptation et Sprint 3
├── START_HERE.md                 # Démarrage rapide historique
└── README.md                     # Ce point d'entrée
```

## Démarrage local

1. Copier `backend/.env.example` vers `backend/.env`.
2. Copier `ai-service/.env.example` vers `ai-service/.env`.
3. Définir la même valeur longue pour `AI_INTERNAL_API_KEY` dans les deux fichiers, renseigner `APP_CORS_ALLOWED_ORIGINS` côté backend, puis renseigner `OPENAI_API_KEY` et Qdrant si nécessaire.
4. Lancer PostgreSQL et Qdrant : `docker compose -f infra/docker-compose.yml up -d` depuis la racine.
5. Lancer FastAPI, puis Spring Boot, puis React. Les détails sont dans les README des sous-projets.

Ne versionnez jamais les deux fichiers `.env`, les mots de passe ou les clés API.

## Documentation

- [Validation Sprint 2](docs/SPRINT2_ACCEPTANCE.md)
- [Backlog QA et Sprint 3](docs/SPRINT3_QA_BACKLOG.md)
- [Contrat backend - IA](backend/docs/ROUTAGE_SAE_IA.md)
- [Migration PostgreSQL Sprint 3](backend/docs/migrations/README.md)
- [Expérimentations et évaluations IA](ai-service/docs/EXPERIMENTATIONS_ET_EVALUATIONS.md)
- [Guide IA existant](ai-service/docs/GUIDE_CODEBASE.md)
- [Architecture et intégration des agents Sprint 3](docs/SPRINT3_AGENT_ARCHITECTURE.md)
- [Plan de test d'intégration Sprint 3](docs/SPRINT3_TEST_PLAN.md)

## Répartition Sprint 2

| Périmètre SAE | Périmètre IA |
| --- | --- |
| Authentification, utilisateurs, projets, repositories, documents | Ingestion, embeddings, indexation Qdrant |
| React, Spring Boot, PostgreSQL, API REST | FastAPI, RAG et évaluations de retrieval |

Les livrables du Sprint 3 sont conservés dans le code lorsqu'ils existent, mais ils ne sont pas annoncés comme terminés.
