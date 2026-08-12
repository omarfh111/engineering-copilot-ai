# Audit de finalisation — Sprint 4

**Date :** 12 août 2026
**Branche auditée :** `sprint4`
**Décision :** **NO-GO temporaire pour la fusion dans `main` : la révocation du secret SMTP historiquement exposé doit être confirmée par le propriétaire du compte.**

## Périmètre vérifié

| Domaine | Résultat | Évidence |
| --- | --- | --- |
| Historique Git | Conforme | `main` est un ancêtre de `sprint4` ; les branches `Sprint2`, `Sprint3`, `sae` et `sprint4` existent sur `origin`. |
| Frontend | Conforme avec réserve | Serveur Vite vérifié en HTTP 200 et `npm run build` réussi ; le bundle JavaScript principal fait 834 kB minifié, au-dessus du seuil d'avertissement de Vite. |
| Service IA | Conforme | FastAPI `/health` répond `ok` ; Qdrant Cloud est joignable et la sonde RAG protégée confirme une collection existante de 800 vecteurs. |
| Backend | Conforme | Spring Boot et PostgreSQL ont démarré ; les 5 tests Maven, dont le smoke test PostgreSQL, réussissent avec Corretto 17. |
| CI | Conforme | Les jobs Frontend, IA et Backend (PostgreSQL éphémère) sont verts sur `388630c` : [exécution GitHub Actions](https://github.com/omarfh111/engineering-copilot-ai/actions/runs/31594408725). |
| Jenkins | Corrigé | Le pipeline valide backend, frontend et IA sans déploiement automatique ni appel à un Compose inexistant. |
| Documentation | Mise à jour | `README.md`, `START_HERE.md` et le [guide technique](TECHNICAL_GUIDE.md) décrivent architecture, exécution, évaluations, incidents et limites. |

## Conditions obligatoires avant la fusion

1. Révoquer et remplacer le mot de passe SMTP qui était auparavant présent dans `backend/.env.example`; une suppression du fichier courant ne purge pas l'historique Git. Cette action appartient au propriétaire du compte SMTP.
2. Les artefacts générés `frontend/*.tsbuildinfo` et les documents d'exécution sous `storage/documents/` sont retirés de l'index et ignorés. Les données locales restent présentes sur la machine, mais ne sont plus distribuées avec le code source.

## Tests exécutés dans cet audit

| Commande | Résultat |
| --- | --- |
| `frontend: npm run build` | Réussi |
| `ai-service: python -m pytest -q` | 34 réussis, 8 ignorés (intégrations externes volontairement désactivées), 1 désélectionné |
| `backend: mvnw.cmd -DskipTests package` | Réussi avec Corretto 17 |
| `backend: mvnw.cmd test` | Réussi : 5 tests, dont 2 smoke tests PostgreSQL |
| Exécution locale | Frontend `5173` HTTP 200 ; FastAPI `8000/health` `ok` ; Spring Boot `8081` et PostgreSQL `5432` joignables |
| Sonde RAG interne | Réussie : HTTP 200, collection existante, 800 vecteurs (Qdrant Cloud) |

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
