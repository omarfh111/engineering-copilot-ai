# Sprint 3 — Plan de test d'intégration

## Préconditions

1. Utiliser une base PostgreSQL de développement et appliquer, dans cet ordre :
   - `backend/docs/migrations/V20260725_01__add_full_audit_analysis_type.sql`
   - `backend/docs/migrations/V20260725_02__add_impact_analysis_type.sql`
   - `backend/docs/migrations/V20260726_01__reviewable_todo_proposals.sql`
2. Vérifier que `AI_INTERNAL_API_KEY` a exactement la même valeur dans `backend/.env` et `ai-service/.env`.
3. Vérifier les fournisseurs :

```powershell
cd ai-service
..\venv\Scripts\python.exe scripts/check_provider_health.py
```

4. Démarrer les trois composants : FastAPI port `8000`, Spring Boot port `8081`, puis React/Vite port `5173`.

## Cas 1 — Audit multi-agent

1. Créer ou choisir un projet, puis un repository GitHub public lié à ce projet.
2. Ouvrir **Analyses**, cliquer **Run repository audit**, sélectionner projet et repository.
3. Cocher *Generate technical documentation* seulement si un brouillon documentaire est souhaité.
4. Actualiser la page après la fin du job.

Attendus : une analyse `FULL_AUDIT` passe de `RUNNING` à `COMPLETED` ou `PARTIAL`, affiche un `correlationId`, les résultats de chaque agent et les findings. Aucun TODO n'est créé.

## Cas 2 — Revue humaine et TODO

1. Ouvrir le détail d'une analyse terminée.
2. Approuver un finding et fournir un commentaire de revue.
3. Vérifier l'étiquette `ACCEPTED` sur le finding.
4. Vérifier les **Generated TODO proposals**, sélectionner les propositions souhaitées,
   puis cliquer **Confirm TODO proposal(s)** et confirmer la création.

Attendus : `todo_agent` génère et persiste une proposition à partir du finding accepté ; Spring crée ensuite le TODO seulement après la seconde confirmation. Une seconde confirmation ne crée pas de doublon.

## Cas 3 — Publication vers la connaissance projet

1. Après l'étape d'approbation du cas 2, cliquer **Publish to knowledge**.
2. Confirmer l'action.
3. Vérifier dans **Documents** qu'un document Markdown `approved_human_feedback` a été créé pour le projet.

Attendus : l'indexation Qdrant est déclenchée par Spring avec la clé interne. Un finding non approuvé n'affiche pas cette action et ne peut pas être indexé.

## Cas 4 — Analyse d'impact

1. Ouvrir une analyse liée à un repository.
2. Cliquer **Analyse impact**.
3. Saisir une description de changement et, si possible, des chemins relatifs au repository.

Attendus : une nouvelle analyse de type `IMPACT` est créée. Seul l'agent impact est exécuté : l'audit complet n'est pas relancé. Les fichiers impactés, risques et tests suggérés sont soumis à la même revue humaine.

## Cas 5 — Documentation IA optionnelle

1. Lancer un audit avec l'option de documentation activée.
2. Attendre la fin, puis ouvrir **Documentation**.

Attendus : un rapport technique IA est créé en `PENDING_REVIEW`; il n'est pas automatiquement approuvé ni publié comme documentation officielle.

## Vérifications techniques

```powershell
cd ai-service
..\venv\Scripts\python.exe -m pytest tests\test_sprint3_contracts.py -q

cd ..
frontend\node_modules\.bin\tsc.cmd --noEmit -p frontend\tsconfig.json
```

La compilation Spring doit être lancée depuis IntelliJ ou un terminal utilisant un **JDK** (et non uniquement un JRE) :

```powershell
cd backend
.\mvnw.cmd test
```
