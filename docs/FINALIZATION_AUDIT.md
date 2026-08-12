# Audit de finalisation — Sprint 4

**Date :** 12 août 2026
**Branche auditée :** `sprint4` (commit de départ `d4063e1`)
**Décision :** **NO-GO temporaire pour la fusion dans `main` : la révocation du secret SMTP historiquement exposé doit être confirmée.**

## Périmètre vérifié

| Domaine | Résultat | Évidence |
| --- | --- | --- |
| Historique Git | Conforme | `main` est un ancêtre de `sprint4` ; les branches `Sprint2`, `Sprint3`, `sae` et `sprint4` existent sur `origin`. |
| Frontend | Conforme avec réserve | `npm run build` réussit ; le bundle JavaScript principal fait 834 kB minifié, au-dessus du seuil d'avertissement de Vite. |
| Service IA | Corrigé et vérifiable | Pytest ne collecte que les vrais tests de `ai-service/tests`, exclut les diagnostics connectés à PostgreSQL et les intégrations externes par défaut. |
| Backend | Conforme | Compilation et test unitaire réussis localement avec Corretto 17 après ajout de la racine TLS locale de Norton au magasin Java. |
| CI | Ajoutée | `.github/workflows/ci.yml` construit le frontend, teste le service IA et compile/teste l'unité backend sous Java 17. |
| Jenkins | Corrigé | Le pipeline valide backend, frontend et IA sans déploiement automatique ni appel à un Compose inexistant. |

## Conditions obligatoires avant la fusion

1. Révoquer et remplacer le mot de passe SMTP qui était auparavant présent dans `backend/.env.example`; une suppression du fichier courant ne purge pas l'historique Git. Cette action appartient au propriétaire du compte SMTP.
2. Laisser s'exécuter la CI GitHub ajoutée et obtenir trois jobs verts sur le commit de finalisation.
3. Ajouter une exécution d'intégration backend avec une base PostgreSQL initialisée. Les tests `@SpringBootTest` actuels ne sont pas exécutés par la CI légère, car `spring.jpa.hibernate.ddl-auto=validate` exige un schéma existant.
4. Examiner les artefacts suivis par Git (`frontend/*.tsbuildinfo` et `storage/documents/...pdf`) et les retirer de l'index s'ils ne sont pas des jeux de données explicitement requis.

## Tests exécutés dans cet audit

| Commande | Résultat |
| --- | --- |
| `frontend: npm run build` | Réussi |
| `ai-service: python -m pytest -q` | 34 réussis, 8 ignorés (intégrations externes volontairement désactivées), 1 désélectionné |
| `backend: mvnw.cmd -DskipTests package` | Réussi avec Corretto 17 |
| `backend: mvnw.cmd -Dtest=AuditLogServiceImplTest test` | Réussi |

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
