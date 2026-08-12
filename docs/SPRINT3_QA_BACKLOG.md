# Sprint 3 - QA et IA avancée (en cours)

Ce document évite de présenter comme terminées des fonctions qui appartiennent au Sprint 3.

| Sujet | État | Prochaine amélioration |
| --- | --- | --- |
| Recherche RAG par projet | En cours | Filtre Qdrant `project_id`, autorisation Spring et sélection de projet dans l'assistant |
| Audit automatique | En cours | Agent sécurité, agent architecture et rapport persistant |
| Analyse repository | En cours | Connecteurs GitHub/GitLab, contrôle d'accès et analyse asynchrone |
| Documentation automatique | En cours | Agent documentation, versionnement des artefacts |
| TODO automatiques | En cours | Agent TODO, priorité, statut et lien vers analyse |
| QA | En cours | Tests unitaires, intégration, contrat et E2E dans la CI |

## Plan QA minimal

1. Tests Spring : authentification, autorisations, CRUD et upload.
2. Tests FastAPI : clé interne, refus de fichier non supporté, limite de taille, chunk overlap et contrat multipart.
3. Tests de contrat : Spring envoie le bon multipart et FastAPI renvoie le schéma attendu.
4. Tests E2E : connexion -> projet -> upload -> indexation -> question avec source.
5. Évaluation IA : conserver le golden dataset séparé des réglages et mesurer qualité des réponses, citations et refus sur contexte absent.
