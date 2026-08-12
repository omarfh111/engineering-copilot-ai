# Audit de finalisation — Sprint 4

**Date :** 12 août 2026
**Branche auditée :** `sprint4` (commit de départ `d4063e1`)
**Décision :** **NO-GO pour la fusion dans `main` à cette étape.**

## Périmètre vérifié

| Domaine | Résultat | Évidence |
| --- | --- | --- |
| Historique Git | Conforme | `main` est un ancêtre de `sprint4` ; les branches `Sprint2`, `Sprint3`, `sae` et `sprint4` existent sur `origin`. |
| Frontend | Conforme avec réserve | `npm run build` réussit ; le bundle JavaScript principal fait 834 kB minifié, au-dessus du seuil d'avertissement de Vite. |
| Service IA | Corrigé et vérifiable | Pytest ne collecte que les vrais tests de `ai-service/tests`, exclut les diagnostics connectés à PostgreSQL et les intégrations externes par défaut. |
| Backend | Non validé localement | L'environnement disponible est Java 8 alors que le projet compile avec Java 21 ; Maven ne peut en outre pas valider le certificat du dépôt Central. |
| CI | Ajoutée | `.github/workflows/ci.yml` construit le frontend, teste le service IA et compile/teste l'unité backend sous Java 21. |
| Jenkins | À corriger avant emploi | Le pipeline actuel tente un `docker compose` à la racine, sans fichier Compose ni Dockerfile racine, et déploie automatiquement. |

## Conditions obligatoires avant la fusion

1. Laisser s'exécuter la CI GitHub ajoutée et obtenir trois jobs verts.
2. Corriger ou remplacer le `Jenkinsfile` : séparer validation et déploiement, et utiliser des fichiers Docker/Compose réellement présents.
3. Ajouter une exécution d'intégration backend avec une base PostgreSQL initialisée. Les tests `@SpringBootTest` actuels ne sont pas exécutés par la CI légère, car `spring.jpa.hibernate.ddl-auto=validate` exige un schéma existant.
4. Normaliser les prérequis documentés : le `pom.xml` cible Java 21 ; les guides ne doivent plus annoncer Java 17.
5. Examiner les artefacts suivis par Git (`frontend/*.tsbuildinfo` et `storage/documents/...pdf`) et les retirer de l'index s'ils ne sont pas des jeux de données explicitement requis.

## Tests exécutés dans cet audit

| Commande | Résultat |
| --- | --- |
| `frontend: npm run build` | Réussi |
| `ai-service: python -m pytest tests/test_foundation_agents.py -q` | 16 réussis, 2 échecs initiaux corrigés dans les attentes de test |
| `backend: .\\mvnw.cmd test` | Non exécutable localement : erreur de certificat Maven (`PKIX`) avant compilation |

## Après les corrections

Quand la CI est verte, fusionner par Git uniquement :

```powershell
git checkout main
git pull origin main
git merge --no-ff sprint4
git push origin main
git push origin Sprint2 Sprint3 sae sprint4
```

Ne pas fusionner en cas d'échec de CI ou d'exécution incomplète des tests d'intégration.
