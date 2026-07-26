# Migrations Sprint 3 : analyses, review, TODO et connaissance projet

Ces scripts PostgreSQL sont à appliquer **une seule fois**, dans l'ordre indiqué,
avant de démarrer le backend avec le profil de production
(`spring.jpa.hibernate.ddl-auto=validate`). Ils rendent compatibles les types
d'analyse `FULL_AUDIT` et `IMPACT`, puis ajoutent les liens du workflow humain :
finding → review → proposition TODO → TODO, ainsi que l'état d'indexation de la
connaissance.

## Procédure sûre

1. Arrêter le backend et faire une sauvegarde de la base PostgreSQL.
2. Vérifier que les migrations Sprint 2 qui créent `analyses`,
   `analysis_findings`, `reviews`, `todos`, `documents` et `users` ont déjà été
   appliquées.
3. Exécuter les scripts avec le rôle propriétaire du schéma :

```powershell
# Use the values from backend/.env. The -W flag prompts safely for
# SPRING_DATASOURCE_PASSWORD; never place the password in this command.
psql -h localhost -p 5432 -U postgres -d copilote_db -W `
  -f backend/docs/migrations/V20260725_01__add_full_audit_analysis_type.sql
psql -h localhost -p 5432 -U postgres -d copilote_db -W `
  -f backend/docs/migrations/V20260725_02__add_impact_analysis_type.sql
psql -h localhost -p 5432 -U postgres -d copilote_db -W `
  -f backend/docs/migrations/V20260726_01__reviewable_todo_proposals.sql
```

4. Redémarrer Spring Boot puis vérifier que l'écran *Analyses* peut afficher
   les findings, enregistrer une décision et générer une proposition TODO.

## Vérification après migration

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'todo_proposals';

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'reviews'
  AND column_name IN ('finding_key', 'finding_id', 'reviewer_user_id');
```

Ne pas lancer le script sur une base non sauvegardée : il retire les doublons
historiques de review pour conserver une décision courante par finding.
