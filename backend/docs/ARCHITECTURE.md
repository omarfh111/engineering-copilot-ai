# Architecture — Engineering Copilot (SAE)

Ce document rassemble les vues d'architecture de la plateforme et reproduit, en
Mermaid, les diagrammes UML fournis dans le cahier des charges et la
présentation. Il complète le [README](../README.md) et
[INTEGRATION_IA.md](INTEGRATION_IA.md).

---

## 1. Architecture générale

```mermaid
flowchart TB
    U["👤 Utilisateur"] --> R["Frontend React (Vite)"]
    R <-->|"REST/JSON + JWT"| S["Backend Spring Boot"]
    S --> P[("PostgreSQL")]
    S -->|"HTTP /api/v1/rag"| F["Service IA FastAPI"]
    S -.->|"à venir"| G["GitHub / GitLab"]
    F --> RAG["Moteur RAG"]
    F -.->|"à venir"| O["Orchestrateur IA"]
    O -.-> AG["Agents d'analyse"]
    RAG --> Q[("Qdrant")]
    AG -.-> Q
    F --> OA["OpenAI (embeddings + LLM)"]
```

### Responsabilités par composant

| Composant | Responsabilités | Interfaces |
| --- | --- | --- |
| Frontend React | Dashboard, administration, projets, documents, chat assistant, rapports | REST/JSON |
| Backend Spring Boot | Authentification, RBAC, API métier, persistance, appel du service IA | PostgreSQL, service IA, Git |
| Service IA FastAPI | RAG (embeddings, retrieval, reranking, génération), à venir orchestration/agents | Qdrant, OpenAI, backend |
| PostgreSQL | Utilisateurs, équipes, projets, documents, analyses, conversations | Transactions JPA |
| Qdrant | Index vectoriels du corpus documentaire | Collections cloisonnées |

---

## 2. Diagramme de cas d'utilisation

> Reproduction simplifiée de la *Figure 1* (source PDF). Le PDF reste la
> référence graphique.

```mermaid
flowchart LR
    subgraph Acteurs
      USER["👤 Utilisateur\n(DEV/ARCHITECT/QA/AUDITOR)"]
      ADMIN["👤 Administrateur"]
    end

    subgraph "Système copilote"
      UC1(["S'authentifier"])
      UC2(["Créer un projet"])
      UC3(["Poser une question"])
      UC4(["Consulter la réponse"])
      UC5(["Consulter les sources"])
      UC6(["Donner un feedback"])
      UC7(["Recherche documentaire"])
      UC8(["Consulter l'historique"])
      UC9(["Gérer les documents"])
      UC10(["Gérer l'équipe"])
      UC11(["Consulter le dashboard"])
      UC12(["Gérer les rapports"])
      UC13(["Auditer / donner une review"])
      UC14(["Changer le statut du projet"])
    end

    USER --> UC1 & UC2 & UC3 & UC7 & UC8
    UC3 -. include .-> UC4
    UC4 -. extend .-> UC5
    UC4 -. extend .-> UC6
    ADMIN --> UC9 & UC10 & UC11 & UC12 & UC13 & UC14
    ADMIN -.->|généralisation| USER
```

---

## 3. Diagramme de classes métier

Reproduction de la *Figure 5* alignée sur le **modèle réellement implémenté**
dans `entity/`. Le backend étend le modèle du cahier (entité `Documentation`,
horodatage `createdAt`/`updatedAt`, statuts additionnels).

```mermaid
classDiagram
    class User {
      +Long id
      +String firstName
      +String lastName
      +String username
      +String email
      +String password
      +Role role
      +boolean enabled
    }
    class Team {
      +Long teamId
      +String teamName
      +String description
    }
    class Project {
      +Long projectId
      +String title
      +String description
      +ProjectStatus status
    }
    class Repository {
      +Long repoId
      +String name
      +String url
      +String technology
      +RepositoryProvider provider
      +String branch
    }
    class Document {
      +Long docId
      +String title
      +String description
      +DocumentType type
      +String path
      +String source
    }
    class Documentation {
      +Long documentationId
      +DocumentationType type
      +String content
      +DocumentationStatus status
      +boolean generatedByAI
      +boolean approved
    }
    class Analysis {
      +Long analysisId
      +AnalysisType type
      +AnalysisStatus status
      +Severity severity
      +Double score
      +String summary
      +String recommendation
    }
    class Review {
      +Long reviewId
      +String comment
      +boolean validated
    }
    class Todo {
      +Long todoId
      +String title
      +String description
      +TodoStatus status
      +Priority priority
    }
    class Conversation {
      +Long convId
      +String question
      +String response
      +Double confidenceScore
      +Long responseTime
    }

    Team "1" --> "*" Project : possède
    Team "*" --> "*" User : membres
    Team "1" --> "0..1" User : leader
    Project "1" --> "*" Repository
    Project "1" --> "*" Document
    Project "1" --> "*" Documentation
    Project "1" --> "*" Analysis
    Project "1" --> "*" Conversation
    Analysis "1" --> "*" Todo
    Analysis "1" --> "*" Review
    User "1" --> "*" Conversation : auteur
    User "1" --> "*" Documentation : createdBy
```

### Énumérations

| Énumération | Valeurs |
| --- | --- |
| `Role` | DEV*/DEVELOPER, ARCHITECT, QA, ADMIN, AUDITOR, MANAGER |
| `ProjectStatus` | CREATED, INDEXING, ANALYZING, READY, AUDITED, CLOSED |
| `DocumentType` | PDF, DOCX, HTML, MD, WIKI |
| `AnalysisType` | PROJECT_STRUCTURE, PROJECT_CONTEXT, BEST_PRACTICES, SECURITY, STANDARDS, CODE_REVIEW, IMPACT_ANALYSIS, DOCUMENTATION |
| `Severity` | LOW, MEDIUM, HIGH, CRITICAL |
| `TodoStatus` | OPEN, IN_PROGRESS, DONE, REJECTED |

> Le backend définit aussi `RepositoryProvider`, `DocumentationType`,
> `DocumentationStatus`, `AnalysisStatus`, `ReviewStatus` et `Priority`
> (valeurs dans `entity/`).

### Machine d'état d'un projet

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> INDEXING
    INDEXING --> READY
    READY --> ANALYZING
    ANALYZING --> AUDITED
    ANALYZING --> READY
    AUDITED --> CLOSED
    READY --> CLOSED
```

---

## 4. Orchestration IA multi-agents (cible — Sprint 3+)

> Reproduction de la *Figure 4*. **Non implémenté au Sprint 2** : le service IA
> expose aujourd'hui le pipeline RAG (`ask-simple`). L'orchestrateur et les
> agents sont la cible des prochains sprints.

```mermaid
flowchart TB
    D["Demande utilisateur"] --> ORC["Orchestrateur IA"]
    ORC --> A1["Agent Analyse Architecture"]
    ORC --> A2["Agent Analyse Structure"]
    ORC --> A3["Agent Contexte Projet"]
    ORC --> A4["Agent Bonnes Pratiques"]
    ORC --> A5["Agent Sécurité"]
    ORC --> A6["Agent Analyse d'Impact"]
    ORC --> A7["Agent Documentation"]
    ORC --> A8["Agent TODO"]
    A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8 --> RES["Résultats intermédiaires"]
    RES --> SYN["Synthèse intelligente"]
    SYN --> OUT["Réponse / Rapport final"]
    OUT --> T1["Liste TODO"]
    OUT --> T2["Documentation générée"]
    OUT --> T3["Dashboard"]
```

---

## 5. Pipeline RAG (côté IA, existant)

```text
Question
  → text-embedding-3-small (OpenAI)
  → recherche Qdrant Top 10
  → reranking CrossEncoder (ms-marco-MiniLM-L-6-v2)
  → Top 5 chunks
  → génération gpt-4o-mini (réponse en français)
  → réponse + fichiers sources + numéros de page
```

Le backend SAE consomme ce pipeline via la route `POST /api/v1/rag/ask-simple`
(voir [INTEGRATION_IA.md](INTEGRATION_IA.md)).
