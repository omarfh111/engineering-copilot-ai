# Sprint 2 - critères d'acceptation

## Référence de périmètre

La présentation du projet est la référence principale : Sprint 2 = développement du socle. Elle attribue au SAE l'authentification, les utilisateurs, les projets, les repositories, les documents, le frontend, le backend et PostgreSQL ; elle attribue à l'IA le pipeline d'ingestion, les embeddings et Qdrant.

## État après consolidation

| Critère | État | Preuve / règle |
| --- | --- | --- |
| SAE : authentification et rôles | Implémenté | Spring Security, JWT et BCrypt |
| SAE : CRUD utilisateurs, projets, repositories et documents | Implémenté | Contrôleurs, services et JPA présents |
| SAE : document réel | Implémenté | `POST /api/documents/upload` conserve le fichier et déclenche l'indexation |
| IA : extraction et chunking | Implémenté | PDF, DOCX, TXT, MD et HTML ; overlap corrigé |
| IA : embeddings et Qdrant | Implémenté | OpenAI `text-embedding-3-small`, collection documentaire configurée |
| Contrat SAE -> IA | Implémenté | Multipart interne, clé de service, aucun chemin local client envoyé à FastAPI |
| PostgreSQL local | Configuré | Mot de passe unifié par variables d'environnement |
| Multi-agents, audit automatique, QA complète | En cours | Sprint 3, hors validation Sprint 2 |

## Conditions obligatoires de validation en environnement local

1. Les deux `.env` sont créés à partir des exemples ; `AI_INTERNAL_API_KEY` est identique dans les deux services.
2. `docker compose up -d` démarre PostgreSQL et Qdrant.
3. FastAPI répond à `/health` ; Spring répond à son endpoint de santé.
4. Un administrateur se connecte, crée un projet puis un document PDF/DOCX/TXT/MD/HTML.
5. Le document est présent dans PostgreSQL, stocké côté SAE et indexé côté Qdrant.
6. Une question via l'assistant retourne une réponse sourcée sur le corpus configuré.
7. Les commandes de vérification listées dans les README passent avec Java 17+, Node.js et les dépendances Python.

## Limites connues, assumées pour Sprint 3

- L'assistant actuel répond au corpus RAG partagé. La recherche filtrée par projet et la persistance des conversations sont à finaliser au Sprint 3.
- L'audit de code, les agents spécialisés, la génération de TODO et de documentation sont préparés mais non déclarés terminés.
- Les tests automatisés doivent être enrichis avant une livraison de production.
