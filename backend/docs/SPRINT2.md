# Sprint 2 — État, acceptation et corrections

## 1. Verdict initial (avant intégration)

**Sprint 2 : NON approuvé** dans l'état livré. Le microservice IA était prêt
(pipeline RAG + API FastAPI), mais **le SAE ne l'appelait pas** : aucune
intégration React → Spring Boot → FastAPI n'existait.

Indices présents mais **non câblés** :

- `spring-boot-starter-restclient` présent dans `pom.xml` mais **inutilisé** ;
- route `/api/assistant/**` sécurisée dans `SecurityConfig` mais **sans contrôleur** ;
- entrée « Assistant » dans la navigation frontend pointant vers une route
  `'/dashboard/assistant'` **sans page** (redirection morte vers `/dashboard`) ;
- entité `Conversation` (`question`, `response`, `confidenceScore`,
  `responseTime`) dont la réponse était **saisie à la main**, jamais générée.

## 2. Ce qui a été livré pour approuver le Sprint 2

Intégration complète et **additive** (aucune fonction sensible modifiée en
profondeur) :

- **Backend** : client `RestClient` vers l'IA, `AssistantController`
  (`/api/assistant/ask` + `/health`), DTO internes (snake_case) et publics
  (camelCase), score de confiance, retry contrôlé, traduction d'erreurs (503).
- **Frontend** : page **Assistant** (chat) branchée sur `/api/assistant/ask`,
  affichage réponse + sources + numéro de page + confiance + état du service IA ;
  route `'/dashboard/assistant'` désormais **fonctionnelle**.
- **Infra** : `docker-compose.yml` (PostgreSQL + Qdrant), `.env.example`.
- **Documentation** : README complet + `docs/ARCHITECTURE.md`,
  `docs/INTEGRATION_IA.md`, ce document.

## 3. Checklist de handoff Sprint 2

Reprise de la checklist du contrat IA (`ROUTAGE_SAE_IA.md`, §14) :

- [x] Spring Boot lit l'URL IA depuis une variable d'environnement (`AI_SERVICE_BASE_URL`).
- [x] Le DTO SAE accepte les champs `snake_case` (via `@JsonProperty`).
- [x] Le timeout couvre le chargement initial du reranker (`response-timeout=90s`).
- [x] Les erreurs `400`, `422` et `500`/réseau sont traduites proprement (400 / 503).
- [x] React appelle **uniquement** Spring Boot (jamais FastAPI).
- [x] FastAPI n'est pas exposé publiquement (appel serveur-à-serveur).
- [x] Un parcours de bout en bout conserve `answer`, `sources` et `page_number`.
- [x] Les routes futures (ingestion, agents…) sont traitées comme non disponibles.
- [ ] *(pré-requis d'exécution, à la charge du testeur)* FastAPI démarre avec un
      `.env` valide et `GET /api/v1/rag/health` renvoie `collection_exists: true`.
- [ ] *(sécurité)* Les clés déjà partagées doivent être révoquées puis régénérées.

## 4. Corrections apportées (à signaler)

Conformément à la consigne « ne pas modifier directement les fonctions
sensibles, mais signaler toute correction » :

| # | Fichier | Correction | Nature |
| --- | --- | --- | --- |
| 1 | `frontend/src/pages/WorkspaceSectionPage.tsx` | **Bug de build pré-existant** : le fichier exportait `SettingsPage` (copie de la page Settings) alors que `App.tsx` importe `WorkspaceSectionPage` avec une prop `moduleId`. Le frontend **ne compilait pas**. Rétabli en une vraie *section page* (rend `kicker`/`headline`/`description` + capacités/limites du module). | Correction nécessaire (compilation) |
| 2 | `frontend/src/App.tsx` | Ajout de l'import + de la route `'/dashboard/assistant'`. | Additif |
| 3 | `frontend/src/lib/workspace.ts` | Module `assistant` élargi à `['ADMIN','DEVELOPER']` (aligné sur `SecurityConfig`) et ajouté à la navigation `ADMIN`. | Additif |
| 4 | `src/main/resources/application.properties` | Ajout des clés `ai.service.*`. | Additif |
| 5 | `src/main/java/.../exception/GlobalExceptionHandler.java` | Ajout d'un handler `AiServiceUnavailableException` → 503 (méthode additive, logique existante inchangée). | Additif |
| 6 | `src/main/java/.../config/AiClientConfig.java` | Timeouts du `RestClient` configurés via `SimpleClientHttpRequestFactory` (Spring Web core) au lieu de `ClientHttpRequestFactorySettings` (indisponible sur ce classpath). | Correction de compilation |

Aucune modification n'a été apportée à `SecurityConfig`, `JwtService`, aux
entités JPA, ni aux services CRUD existants.

## 5. Limites de vérification dans l'environnement de préparation

- **Frontend** : `npm run build` (tsc + vite) **passe** ✅.
- **Backend** : non compilé ici (pas de JDK 17 / Maven / Docker disponibles) ;
  code revu ligne à ligne contre les API Spring Boot 4.1 / Jackson 3. À compiler
  chez le testeur via `./mvnw compile` puis `./mvnw spring-boot:run`.
- **Bout en bout** : nécessite le service IA en marche (clé OpenAI + collection
  Qdrant). Procédure dans le [README](../README.md#12-tests-et-vérification).
