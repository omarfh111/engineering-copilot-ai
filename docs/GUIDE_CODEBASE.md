# Guide détaillé de la codebase

Ce document explique l'organisation du dépôt, le rôle de chaque fichier important et son état réel au Sprint 2. Les mentions **actif**, **expérimental**, **préparé** et **vide** évitent de confondre le code utilisable avec l'architecture prévue.

## 1. Lecture rapide du dépôt

```text
app/          code du microservice FastAPI IA
experiments/  préparation du corpus, benchmarks et évaluations RAG
tests/        tests de configuration et d'intégration
data/         dossiers réservés aux futures données applicatives
docker/       déploiement à compléter
docs/         documentation de compréhension et d'intégration
```

Flux actif actuel :

```text
app/main.py
  -> app/api/v1/rag.py
  -> app/api/dependencies.py
  -> app/services/langchain_rag_service.py
      -> embedding_service.py
      -> qdrant_service.py
      -> reranker_service.py ou llm_reranker_service.py
      -> OpenAI Chat
```

## 2. Fichiers à la racine

| Fichier | État | Rôle |
| --- | --- | --- |
| `README.md` | actif | présentation, installation, architecture, résultats et état des sprints |
| `.env.example` | actif | modèle sans secret pour toutes les variables exigées par `Settings` |
| `.env` | local, ignoré | vraies clés et configuration de la machine ; ne jamais committer |
| `requirements.txt` | actif à nettoyer | dépendances Python ; contient encore des doublons et aucune version figée |
| `.gitignore` | actif | exclut environnement virtuel, secrets, logs, caches et artefacts locaux |
| `LICENSE` | actif | licence MIT |

## 3. Application FastAPI

### Point d'entrée et API

| Fichier | État | Rôle |
| --- | --- | --- |
| `app/main.py` | **actif** | crée FastAPI, configure CORS, expose `/` et `/health`, monte le router RAG sous `/api/v1` |
| `app/api/dependencies.py` | **actif** | construit et met en cache jusqu'à 10 instances de `LangChainRAGService` ; fixe actuellement OpenAI, Top 10 et Top 5 |
| `app/api/v1/rag.py` | **actif** | définit les schémas Pydantic et les routes `/rag/ask`, `/rag/retrieve`, `/rag/health`, `/rag/ask-simple` |
| `app/api/router.py` | vide | emplacement prévu pour agréger plusieurs routers |
| `app/api/__init__.py` | vide | marqueur de package prévu |
| `app/api/v1/__init__.py` | vide | marqueur de version d'API prévu |

`ask-simple` est l'interface recommandée pour Spring Boot. Les schémas sont encore déclarés directement dans `rag.py`; ils pourront être déplacés dans `app/schemas/` lorsque l'API grandira.

### Routes préparées mais non implémentées

Tous les fichiers suivants sont vides et ne sont pas montés par `app/main.py` :

| Fichier | Fonction prévue |
| --- | --- |
| `app/api/routes/auth.py` | authentification interne ou routes d'identité |
| `app/api/routes/projects.py` | opérations liées aux projets |
| `app/api/routes/repository.py` | connexion et analyse des repositories |
| `app/api/routes/documents.py` | upload, indexation et suivi documentaire |
| `app/api/routes/chat.py` | conversation et historique |
| `app/api/routes/analysis.py` | lancement et consultation d'analyses |
| `app/api/routes/audit.py` | audits qualité/sécurité |
| `app/api/routes/documentation.py` | génération documentaire |
| `app/api/routes/todo.py` | recommandations et tâches générées |

## 4. Configuration et infrastructure

| Fichier | État | Rôle |
| --- | --- | --- |
| `app/core/config.py` | **actif** | définit `Settings`, charge `.env`, valide les types et met la configuration en cache |
| `app/core/logging.py` | **actif** | logger couleur console + fichier `logs/app.log` |
| `app/core/constants.py` | préparé | constantes de providers, rôles et types d'analyse |
| `app/core/langsmith.py` | expérimental | initialise les variables LangSmith directement depuis l'environnement |
| `app/core/llm.py` | vide | futur client LLM centralisé |
| `app/core/security.py` | vide | future sécurité service-à-service |

Attention : toutes les propriétés de `Settings` sont obligatoires, même si certaines ne sont pas utilisées par les routes RAG. Certaines valeurs sont encore codées en dur dans `dependencies.py` et ne suivent donc pas directement `TOP_K`, `EMBEDDING_MODEL` ou `QDRANT_COLLECTION`.

## 5. Services IA actifs

| Fichier | État | Responsabilité principale |
| --- | --- | --- |
| `app/services/embedding_service.py` | **actif** | `embed_query`, `embed_documents`, OpenAI ou SentenceTransformers, détection de dimension |
| `app/services/qdrant_service.py` | **actif** | collections, UUID stables, upsert, recherche, payloads et informations de collection |
| `app/services/reranker_service.py` | **actif** | charge paresseusement le CrossEncoder, ajoute scores embedding/reranking et conserve le Top K final |
| `app/services/llm_reranker_service.py` | **actif optionnel** | demande à un modèle OpenAI de sélectionner les indexes les plus pertinents et valide le JSON retourné |
| `app/services/rag_service.py` | actif de référence | implémentation RAG directe avec OpenAI SDK, conservée comme baseline testée |
| `app/services/langchain_rag_service.py` | **actif principal** | retrieval, contexte, prompt, génération française, sources et traces LangSmith |

### `EmbeddingService`

- crée le client OpenAI uniquement au premier besoin ;
- charge le modèle SentenceTransformer uniquement au premier besoin ;
- rejette les requêtes ou listes vides ;
- normalise les embeddings locaux ;
- baseline : OpenAI 1536 dimensions, MiniLM 384 dimensions.

### `QdrantService`

- `create_collection()` crée sans écraser ;
- `recreate_collection()` supprime puis recrée : à utiliser seulement sur une collection de test ;
- `build_point()` transforme un chunk et son embedding en `PointStruct` ;
- `upsert_chunks()` envoie les points par lots de 64 ;
- `search()` utilise `query_points()` et renvoie texte, source, page et scores ;
- `get_collection_info()` expose `points_count` et le statut.

Le filtre de catégorie est appliqué après le Top K Qdrant. Il peut donc produire moins de résultats que demandé.

### `RerankerService`

- modèle : `cross-encoder/ms-marco-MiniLM-L-6-v2` ;
- entrée habituelle : 10 chunks ;
- sortie : 5 chunks ;
- les scores peuvent être négatifs : leur ordre importe, pas leur signe ;
- le premier appel est plus lent à cause du chargement du modèle.

### `LangChainRAGService`

- compose `ChatPromptTemplate`, `ChatOpenAI` et `StrOutputParser` ;
- exige une réponse fondée uniquement sur le contexte ;
- demande une réponse finale en français ;
- supporte `cross_encoder`, `llm` et `none` ;
- trace `retrieve`, `build_context`, `generate_answer` et `answer_question` ;
- retourne réponse, sources, pages, scores et paramètres de pipeline.

## 6. Services futurs vides

| Fichier | Fonction prévue |
| --- | --- |
| `app/services/ingestion_service.py` | extraction, nettoyage, embedding et indexation d'un nouveau document |
| `app/services/github_service.py` | lecture sécurisée d'un repository GitHub |
| `app/services/gitlab_service.py` | lecture sécurisée d'un repository GitLab |
| `app/services/llm_service.py` | abstraction commune des modèles de génération |

## 7. PostgreSQL

| Fichier | État | Rôle |
| --- | --- | --- |
| `app/database/base.py` | préparé | classe `DeclarativeBase` pour les futurs modèles ORM |
| `app/database/postgres.py` | actif mais hors RAG | construit l'URL PostgreSQL et l'engine SQLAlchemy avec `pool_pre_ping` |
| `app/database/session.py` | actif mais hors RAG | fabrique `SessionLocal` |
| `app/database/qdrant.py` | vide | ancien emplacement possible ; le client réel est dans `services/qdrant_service.py` |
| `app/database/__init__.py` | vide | marqueur de package |

La chaîne RAG actuelle n'utilise pas PostgreSQL. La base est destinée aux utilisateurs, projets, documents, conversations, audits et statuts métier côté plateforme.

## 8. Modèles et schémas futurs

Les fichiers suivants sont tous vides au Sprint 2.

### Modèles ORM prévus

| Fichier | Entité prévue |
| --- | --- |
| `app/models/project.py` | projet métier |
| `app/models/repository.py` | repository associé |
| `app/models/document.py` | document et statut d'indexation |
| `app/models/conversation.py` | conversation et messages |
| `app/models/analysis.py` | analyse ou audit |
| `app/models/todo.py` | recommandation/action |
| `app/models/ingestion_service.py` | nom ambigu à corriger : un modèle de job d'ingestion serait préférable |

### DTO Pydantic prévus

| Fichier | Contrats prévus |
| --- | --- |
| `app/schemas/chat.py` | questions, réponses et historique |
| `app/schemas/document.py` | upload et statut documentaire |
| `app/schemas/project.py` | données projet |
| `app/schemas/repository.py` | repository, branche et commit |

## 9. Architecture multi-agents prévue

`app/orchestrator/orchestrator.py` est vide. Il devra sélectionner les agents, distribuer le contexte, agréger les résultats et produire une synthèse.

Tous les agents sont également vides :

| Fichier | Mission prévue |
| --- | --- |
| `app/agents/context_agent.py` | résumer le contexte d'un projet |
| `app/agents/structure_agent.py` | analyser arborescence, modules et dépendances |
| `app/agents/architecture_agent.py` | évaluer architecture, couches et couplage |
| `app/agents/quality_agent.py` | détecter problèmes de qualité et maintenabilité |
| `app/agents/security_agent.py` | appliquer contrôles OWASP/NIST |
| `app/agents/impact_agent.py` | estimer l'impact d'une modification |
| `app/agents/documentation_agent.py` | produire README, guides et descriptions |
| `app/agents/todo_agent.py` | transformer les constats en tâches actionnables |

Les prompts `app/prompts/architecture.txt`, `documentation.txt`, `impact.txt`, `security.txt` et `todo.txt` sont des placeholders vides associés à ces futurs agents.

## 10. Modules RAG et utilitaires futurs

Ces fichiers sont des emplacements de refactorisation, mais sont vides :

| Fichier | Fonction prévue |
| --- | --- |
| `app/rag/chunker.py` | chunking réutilisable hors expériences |
| `app/rag/retriever.py` | abstraction du retrieval |
| `app/rag/reranker.py` | abstraction du reranking |
| `app/rag/prompt_builder.py` | construction contrôlée du prompt |
| `app/rag/citations.py` | normalisation et validation des citations |
| `app/utils/parser.py` | parsing de code/documents |
| `app/utils/tokenizer.py` | comptage et limites de tokens |
| `app/utils/tree.py` | représentation d'arborescences de repository |
| `app/utils/markdown.py` | génération et nettoyage Markdown |

Le code réel correspondant est encore dans `experiments/scripts/` ou `app/services/`.

## 11. Scripts d'expérimentation

| Fichier | Entrée | Sortie / travail effectué |
| --- | --- | --- |
| `experiments/scripts/chunk_documents.py` | documents de `data/raw` | extrait PDF/DOCX/TXT/MD/HTML page par page et génère `chunks.jsonl` |
| `experiments/scripts/clean_chunks.py` | `chunks.jsonl` | normalise, filtre le bruit et produit `chunks_clean.jsonl` |
| `experiments/scripts/inspect_chunks.py` | chunks nettoyés | affiche statistiques et échantillons pour contrôle humain |
| `experiments/scripts/create_balanced_sample.py` | `chunks_clean.jsonl` | sélectionne 200 chunks par catégorie, total 800 |
| `experiments/scripts/test_embeddings.py` | 80 chunks équilibrés | compare 5 modèles et écrit JSON/CSV |
| `experiments/scripts/index_qdrant.py` | 800 chunks | recrée les collections, calcule embeddings et indexe Qdrant |
| `experiments/scripts/test_retrieval.py` | golden dataset + collections | exécute les 64 questions en Top K et écrit les résultats bruts |
| `experiments/scripts/evaluate_retrieval.py` | résultats + golden dataset | calcule Hit, précision, recall, MRR, catégorie et temps |
| `experiments/scripts/test_reranking.py` | retrieval Top 10 | reranke OpenAI/MiniLM avec CrossEncoder et garde Top 5 |
| `experiments/scripts/generate_comparison_report.py` | trois fichiers de synthèse | génère `comparison_report.md` |

Les scripts sont des outils de recherche. Ils utilisent encore des constantes en tête de fichier plutôt qu'une CLI paramétrable.

## 12. Données et artefacts

### Corpus brut

| Catégorie | Documents |
| --- | --- |
| `architecture` | Clean Architecture, Hexagonal Architectures, Microservices Designing/Deploying, NIST Cloud Reference Architecture |
| `coding_standards` | Clean Code, Coding Best Practices, Java Coding Guidelines, PEP 8, SonarQube in Action, SOLID Principles |
| `framework_docs` | Docker tutorial, FastAPI slides, Kubernetes 101, Spring Boot reference |
| `security` | NIST SSDF, OWASP Secure Coding Practices, OWASP API Top 10, OWASP ASVS, préparation OWASP Top 10 |

Inventaire exact des 19 fichiers :

| Fichier | Sujet utilisé par le RAG |
| --- | --- |
| `architecture/Clean Architecture A Craftsman's Guide to Software Structure and Design.pdf` | Clean Architecture et règle de dépendance |
| `architecture/hexagonal-architectures.pdf` | architecture hexagonale, ports et adapters |
| `architecture/Microservices_Designing_Deploying.pdf` | conception et déploiement de microservices |
| `architecture/nistspecialpublication500-292.pdf` | architecture de référence cloud NIST |
| `coding_standards/clean-code.pdf` | lisibilité, fonctions, noms et pratiques Clean Code |
| `coding_standards/coding_best_practices_2020-06-03.pdf` | bonnes pratiques générales de développement |
| `coding_standards/Java Coding Guidelines_ 75 Recommendations for Reliable and Secure Programs.pdf` | fiabilité et sécurité Java |
| `coding_standards/Python_PEP8_TheStyleGuideForPythonCode.pdf` | conventions PEP 8 |
| `coding_standards/SonarQube_in_Action.pdf` | qualité statique et SonarQube |
| `coding_standards/The_SOLID_Principles.pdf` | principes SOLID |
| `framework_docs/docker-tutorial.pdf` | conteneurs et commandes Docker |
| `framework_docs/PDFFastAPISlides.pdf` | concepts FastAPI |
| `framework_docs/ri3_k8s_101.pdf` | notions Kubernetes |
| `framework_docs/spring-boot-reference.pdf` | référence Spring Boot |
| `security/nist.sp.800-218.pdf` | Secure Software Development Framework |
| `security/OWASP_SCP_Quick_Reference_Guide_v21.pdf` | pratiques de codage sécurisé |
| `security/owasp-api-security-top-10.pdf` | risques de sécurité des API |
| `security/OWASPLondon_20190225_vanderaj_ASVSv4.pdf` | standard de vérification ASVS |
| `security/preparing-for-the-new-owasp-top-10-and-beyond .pdf` | évolution OWASP Top 10 |

### Données traitées

| Fichier | Rôle |
| --- | --- |
| `experiments/data/processed/chunks/chunks.jsonl` | 7156 chunks page-aware dans l'artefact actuel ; la première campagne en comptait 5604 |
| `experiments/data/processed/chunks/chunks_clean.jsonl` | 5821 chunks actuels après filtrage ; la première campagne en comptait 4831 |
| `experiments/data/processed/chunks/chunks_sample_balanced.jsonl` | 800 chunks équilibrés utilisés pour benchmark |
| `experiments/data/evaluation/rag_golden_eval_v1.json` | vérité terrain de 64 questions avec documents, catégories et pages attendus |

### Résultats

| Fichier | Contenu |
| --- | --- |
| `experiments/results/embedding_results.json` | benchmark complet lisible par scripts |
| `experiments/results/embedding_results.csv` | benchmark embeddings pour tableur |
| `experiments/results/qdrant_indexing_results.json` | points, dimensions et temps d'indexation |
| `experiments/results/retrieval_results.json` | résultats Top K de chaque question/modèle |
| `experiments/results/retrieval_evaluation_summary.json` | synthèse et détails embedding-only |
| `experiments/results/retrieval_evaluation_summary.csv` | synthèse embedding-only pour tableur |
| `experiments/results/reranked_results.json` | résultats après CrossEncoder |
| `experiments/results/reranked_evaluation_summary.json` | synthèse et détails après reranking |
| `experiments/results/reranked_evaluation_summary.csv` | synthèse reranking pour tableur |
| `experiments/results/comparison_report.md` | rapport Markdown généré à partir des résultats |

## 13. Tests

| Fichier | Type | Ce qu'il vérifie |
| --- | --- | --- |
| `tests/test_config.py` | smoke local | chargement et affichage de la configuration |
| `tests/test_logger.py` | smoke local | niveaux et destinations du logger |
| `tests/test_postgres_engine.py` | intégration PostgreSQL | connexion et `SELECT version()` |
| `tests/test_session.py` | intégration PostgreSQL | ouverture de session et base courante |
| `tests/test_langsmith.py` | intégration OpenAI/LangSmith | appel ChatOpenAI traçable |
| `tests/test_embedding_service.py` | local + OpenAI | dimensions des deux providers |
| `tests/test_qdrant_service.py` | intégration OpenAI/Qdrant | recrée une collection de 10 points et recherche |
| `tests/test_reranker_service.py` | intégration | retrieval Top 10 et CrossEncoder Top 5 |
| `tests/test_llm_reranker_service.py` | intégration cloud | reranking par `gpt-4o-mini` |
| `tests/test_rag_service.py` | bout en bout cloud | baseline OpenAI SDK, réponse et sources |
| `tests/test_langchain_rag_service.py` | bout en bout cloud | LangChain, LLM reranker, réponse et sources |
| `tests/test_api.py` | vide | tests FastAPI à écrire |
| `tests/test_agents.py` | vide | tests d'agents à écrire au Sprint 3 |
| `tests/test_rag.py` | vide | ancien placeholder |

Ces tests ne sont pas tous unitaires. Plusieurs font de vrais appels payants et suppriment/recréent une collection de test Qdrant.

## 14. Dossiers réservés et Docker

Les dossiers `data/chunks`, `data/documents`, `data/embeddings`, `data/outputs` et `data/repositories` sont actuellement vides. Les données d'expérimentation réelles sont sous `experiments/data`.

Dans `docker/` :

- `docker-compose.yml` est vide ;
- `Dockerfile` est actuellement un dossier vide portant ce nom, pas encore un fichier Docker valide.

Le déploiement Docker annoncé dans l'architecture reste donc à implémenter.

## 15. Où modifier quoi ?

| Besoin | Fichier principal |
| --- | --- |
| ajouter/modifier une route RAG | `app/api/v1/rag.py` |
| changer la baseline et les Top K | `app/api/dependencies.py`, puis centraliser dans `config.py` |
| modifier le prompt final | `app/services/langchain_rag_service.py` |
| changer le modèle d'embedding | `app/services/embedding_service.py` et collection Qdrant compatible |
| modifier les payloads Qdrant | `app/services/qdrant_service.py` |
| ajouter l'ingestion dynamique | `app/services/ingestion_service.py` + nouvelle route versionnée |
| ajouter un agent | `app/agents/`, `app/prompts/` et orchestrateur |
| refaire un benchmark | `experiments/scripts/` |
| modifier les DTO Spring attendus | `app/api/v1/rag.py` + `docs/ROUTAGE_SAE_IA.md` |

## 16. Dette technique prioritaire

1. Paramétrer réellement collection, modèles et Top K depuis `Settings`.
2. Déplacer le filtre de catégorie dans la requête Qdrant.
3. Isoler tests unitaires, intégration locale et intégration cloud avec des marqueurs Pytest.
4. Paramétrer les scripts d'expérience en ligne de commande au lieu d'éditer leurs constantes.
5. Implémenter ingestion, isolation par projet et suppression/réindexation.
6. Compléter authentification interne, erreurs structurées et correlation ID.
7. Créer un vrai Dockerfile et un `docker-compose.yml` testable.
8. Figer et dédupliquer `requirements.txt`.
