# Audit de finalisation — Sprint 4

**Date :** 12 août 2026
**Branche auditée :** `sprint4`
**Décision :** **NO-GO temporaire pour la fusion dans `main` : la révocation du secret SMTP historiquement exposé doit être confirmée et le parcours RAG doit être vérifié avec Qdrant démarré.**

## Périmètre vérifié

| Domaine | Résultat | Évidence |
| --- | --- | --- |
| Historique Git | Conforme | `main` est un ancêtre de `sprint4` ; les branches `Sprint2`, `Sprint3`, `sae` et `sprint4` existent sur `origin`. |
| Frontend | Conforme avec réserve | Serveur Vite vérifié en HTTP 200 et `npm run build` réussi ; le bundle JavaScript principal fait 834 kB minifié, au-dessus du seuil d'avertissement de Vite. |
| Service IA | Conforme en liveness, RAG non validé localement | FastAPI `/health` répond `ok` et Pytest ne collecte que les vrais tests ; Qdrant n'était pas démarré sur la machine auditée, la sonde RAG protégée a donc répondu 500. |
| Backend | Conforme | Spring Boot et PostgreSQL ont démarré ; les 5 tests Maven, dont le smoke test PostgreSQL, réussissent avec Corretto 17. |
| CI | Conforme | Les jobs Frontend, IA et Backend (PostgreSQL éphémère) sont verts sur `388630c` : [exécution GitHub Actions](https://github.com/omarfh111/engineering-copilot-ai/actions/runs/31594408725). |
| Jenkins | Corrigé | Le pipeline valide backend, frontend et IA sans déploiement automatique ni appel à un Compose inexistant. |
| Documentation | Mise à jour | `README.md`, `START_HERE.md` et le [guide technique](TECHNICAL_GUIDE.md) décrivent architecture, exécution, évaluations, incidents et limites. |

## Conditions obligatoires avant la fusion

1. Révoquer et remplacer le mot de passe SMTP qui était auparavant présent dans `backend/.env.example`; une suppression du fichier courant ne purge pas l'historique Git. Cette action appartient au propriétaire du compte SMTP.
2. Démarrer Qdrant et exécuter une vérification RAG protégée (ou les tests `integration`) avec les secrets du coffre ; ce contrôle n'est pas couvert par la CI légère afin d'éviter un appel fournisseur et des coûts.
3. Les artefacts générés `frontend/*.tsbuildinfo` ont été retirés de l'index. Les trois PDF identiques dans `storage/documents/project-3/` doivent être conservés uniquement s'ils constituent volontairement un jeu de données de démonstration ; sinon, les retirer de Git et les stocker hors dépôt.

## Tests exécutés dans cet audit

| Commande | Résultat |
| --- | --- |
| `frontend: npm run build` | Réussi |
| `ai-service: python -m pytest -q` | 34 réussis, 8 ignorés (intégrations externes volontairement désactivées), 1 désélectionné |
| `backend: mvnw.cmd -DskipTests package` | Réussi avec Corretto 17 |
| `backend: mvnw.cmd test` | Réussi : 5 tests, dont 2 smoke tests PostgreSQL |
| Exécution locale | Frontend `5173` HTTP 200 ; FastAPI `8000/health` `ok` ; Spring Boot `8081` et PostgreSQL `5432` joignables |
| Sonde RAG interne | Échec attendu sur l'hôte audité : Qdrant `6333` indisponible |

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
