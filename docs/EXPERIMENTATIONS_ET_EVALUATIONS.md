# Expérimentations, tests et évaluations RAG

Ce document conserve la méthodologie du Sprint IA, les résultats obtenus et les limites d'interprétation. Les valeurs proviennent du rapport de sprint et des artefacts enregistrés sous `experiments/results/`.

## 1. Objectif expérimental

L'objectif était de valider une baseline RAG mesurée avant l'intégration SAE :

```text
documents
  -> extraction par page
  -> chunking
  -> nettoyage
  -> embeddings
  -> indexation Qdrant
  -> retrieval
  -> golden evaluation
  -> reranking
  -> réponse sourcée
```

Les expériences de ce sprint évaluent surtout la capacité à retrouver le bon fichier et la bonne catégorie. Les pages sont stockées et citées, mais la version actuelle du script d'évaluation ne calcule pas encore une métrique page-level complète.

## 2. Corpus

| Élément | Valeur |
| --- | ---: |
| documents | 19 |
| pages approximatives | 2967 |
| catégories | 4 |
| première campagne : chunks bruts | 5604 |
| première campagne : chunks propres | 4831 |
| artefact page-aware actuel : chunks bruts | 7156 |
| artefact page-aware actuel : chunks propres | 5821 |
| échantillon d'évaluation | 800 |

La première campagne, avant la régénération page par page, avait supprimé environ 773 chunks. Les fichiers présents dans le dépôt ont ensuite été régénérés : le filtrage actuel retire 1335 enregistrements sur 7156.

Répartition des artefacts page-aware actuellement versionnés :

| Catégorie | Chunks bruts | Chunks nettoyés | Échantillon |
| --- | ---: | ---: | ---: |
| architecture | 1264 | 1075 | 200 |
| coding_standards | 3422 | 2741 | 200 |
| framework_docs | 2080 | 1671 | 200 |
| security | 390 | 334 | 200 |

Paramètres de chunking : taille 1000 caractères, overlap 200. Lors de la première campagne, la longueur moyenne rapportée après nettoyage était de 994 caractères, avec un minimum de 220 et un maximum de 1000.

## 3. Golden dataset

`experiments/data/evaluation/rag_golden_eval_v1.json` contient :

| Type | Nombre | Objectif |
| --- | ---: | --- |
| factual | 28 | retrouver une information précise |
| cross_doc | 16 | combiner ou distinguer plusieurs documents |
| multi_hop | 10 | suivre plusieurs éléments de raisonnement |
| negative | 10 | détecter l'absence d'une réponse fiable |
| total | 64 | évaluation complète |

Chaque question positive contient les chemins de documents, catégories et pages 1-based attendus. Une question négative possède une liste `relevant_chunks` vide.

Points de vigilance du golden dataset :

- le document OWASP API Top 10 est bilingue ;
- PEP 8 et SonarQube ont une extraction parfois pauvre ;
- les pages attendues correspondent aux indexes du PDF, pas à la pagination imprimée ;
- un contrôle humain de plusieurs exemples reste nécessaire.

## 4. Métriques

| Métrique | Signification |
| --- | --- |
| Hit@K fichier | au moins un résultat parmi K vient d'un fichier attendu |
| Precision@K fichier | proportion des chunks retournés provenant des fichiers attendus |
| Recall@K fichier | couverture des fichiers attendus, plafonnée à 1 dans le script actuel |
| MRR | inverse du rang du premier résultat pertinent ; favorise un bon résultat placé tôt |
| Hit@K catégorie | présence d'au moins un chunk de la catégorie attendue |
| temps moyen | durée moyenne du retrieval enregistrée par question |

Pour les questions négatives, le script considère le test réussi si le score maximal est inférieur à `0.45`. Ce seuil est global et devra être calibré séparément pour chaque modèle.

Limite importante : plusieurs chunks du même fichier sont comptés séparément dans la précision. Les métriques sont adaptées à la comparaison interne de ces essais, mais ne doivent pas être présentées comme une évaluation académique définitive.

## 5. Préparation des données

### Chunking

Commande :

```powershell
python -m experiments.scripts.chunk_documents
```

Le script accepte PDF, DOCX, TXT, Markdown et HTML. Les PDF sont parcourus page par page afin de conserver `page_number`.

### Nettoyage

```powershell
python -m experiments.scripts.clean_chunks
```

Filtres principaux : copyright, ISBN, éditeur, trademarks, warranty, table des matières, chunks courts, faible ratio alphabétique et structures ressemblant à un sommaire.

### Inspection manuelle

```powershell
python -m experiments.scripts.inspect_chunks
```

Cette étape vérifie que les chunks contiennent du contenu technique exploitable et pas seulement des métadonnées éditoriales.

### Échantillon équilibré

```powershell
python -m experiments.scripts.create_balanced_sample
```

Le script utilise un seed fixe et sélectionne 200 chunks par catégorie. Cela empêche `coding_standards` de dominer les comparaisons.

## 6. Benchmark des embeddings

Commande historique :

```powershell
python -m experiments.scripts.test_embeddings
```

| Modèle | Provider | Dimension | Chunks | Chargement | Embedding | Moyenne/chunk |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| qwen3-embedding:8b | Ollama | 4096 | 80 | 0 s | 50.534 s | 0.6317 s |
| text-embedding-3-small | OpenAI | 1536 | 80 | 0 s | 5.897 s | 0.0737 s |
| all-MiniLM-L6-v2 | SentenceTransformers | 384 | 80 | 3.938 s | 1.863 s | 0.0233 s |
| BAAI/bge-m3 | SentenceTransformers | 1024 | 80 | 6.094 s | 46.950 s | 0.5869 s |
| nomic-embed-text-v1.5 | SentenceTransformers | 768 | 80 | 49.492 s | 18.786 s | 0.2348 s |

Conclusion intermédiaire : MiniLM est excellent pour une exécution locale légère ; OpenAI est plus adapté à la baseline grâce à la qualité finale observée.

## 7. Indexation Qdrant

Les dimensions imposent une collection séparée par modèle :

| Collection | Modèle | Dimension |
| --- | --- | ---: |
| `exp_qwen3_embedding_8b` | Qwen3 | 4096 |
| `exp_openai_text_embedding_3_small` | OpenAI | 1536 |
| `exp_minilm_l6_v2` | MiniLM | 384 |
| `exp_bge_m3` | BGE-M3 | 1024 |
| `exp_nomic_embed_text_v15` | Nomic | 768 |

Une première indexation de 200 points par collection a validé la stabilité. L'indexation finale enregistrée concerne OpenAI et MiniLM sur 800 points :

| Modèle | Points | Temps total | Moyenne/chunk |
| --- | ---: | ---: | ---: |
| OpenAI | 800 | 58.371 s | 0.0730 s |
| MiniLM | 800 | 50.875 s | 0.0636 s |

Commande :

```powershell
python -m experiments.scripts.index_qdrant
```

Attention : `index_qdrant.py` appelle `recreate_collection` et supprime les collections portant le même nom avant de les recréer. Utiliser un environnement Qdrant de test. Dans le snapshot actuel, seuls OpenAI et MiniLM sont activés ; les trois autres configurations sont commentées.

## 8. Retrieval avec 200 chunks

| Modèle | Hit@5 fichier | Precision@5 | Recall@5 | MRR | Hit catégorie | Temps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Qwen3 | 0.8438 | 0.6281 | 0.7995 | 0.7628 | 0.9219 | 2.6794 s |
| OpenAI | 0.8438 | 0.6344 | 0.8177 | 0.7526 | 0.9688 | 1.2317 s |
| MiniLM | 0.8281 | 0.5906 | 0.7734 | 0.7492 | 0.9062 | 3.3290 s |
| BGE-M3 | 0.7812 | 0.5500 | 0.7292 | 0.6943 | 0.9531 | 6.2663 s |
| Nomic | 0.6719 | 0.4344 | 0.6016 | 0.5547 | 0.7812 | 6.3285 s |

Qwen3 et OpenAI étaient proches, mais OpenAI présentait un meilleur recall et un meilleur temps. Nomic était nettement derrière.

## 9. Retrieval avec 800 chunks

| Modèle | Hit@5 fichier | Precision@5 | Recall@5 | MRR | Hit catégorie | Temps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| OpenAI | 0.9219 | 0.7562 | 0.9036 | 0.8385 | 0.9531 | 1.1670 s |
| MiniLM | 0.8906 | 0.7000 | 0.8750 | 0.8203 | 0.9375 | 3.3034 s |
| Qwen3 | 0.8906 | 0.7219 | 0.8724 | 0.8065 | 0.9531 | 2.6933 s |
| BGE-M3 | 0.8125 | 0.6531 | 0.7969 | 0.7708 | 0.9062 | 6.1310 s |
| Nomic | 0.7188 | 0.5625 | 0.6849 | 0.6523 | 0.8125 | 6.4037 s |

Cette phase a conduit à retenir OpenAI comme principal et MiniLM comme alternative locale.

## 10. Ajout de `page_number`

Après le passage à l'extraction PDF page par page, une première réévaluation Top 5 a donné :

| Modèle | Hit@5 | Precision@5 | Recall@5 | MRR | Hit catégorie | Temps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| OpenAI | 0.8594 | 0.7125 | 0.8411 | 0.7904 | 0.9531 | 0.8317 s |
| MiniLM | 0.8438 | 0.6531 | 0.8203 | 0.7388 | 0.9375 | 4.9760 s |

La variation par rapport au test précédent est attendue : découper à la frontière de chaque page modifie les unités de retrieval. Le bénéfice est une traçabilité précise vers le document.

## 11. Top 10 avant reranking

| Modèle | Hit@10 | Precision@10 | Recall@10 | MRR | Hit catégorie | Temps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| MiniLM | 0.9062 | 0.6281 | 0.8880 | 0.7465 | 0.9531 | 4.9525 s |
| OpenAI | 0.8906 | 0.6703 | 0.8724 | 0.7942 | 0.9688 | 0.8125 s |

MiniLM retrouve légèrement plus souvent un fichier attendu dans les dix résultats. OpenAI reste meilleur en précision, MRR et temps, donc le premier bon résultat apparaît généralement plus tôt.

## 12. Reranking CrossEncoder

Commande :

```powershell
python -m experiments.scripts.test_reranking
```

| Embedding | Sortie | Hit fichier | Précision | Recall | MRR | Hit catégorie |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| OpenAI | Top 5 | 0.8750 | 0.7063 | 0.8490 | 0.8091 | 0.9375 |
| MiniLM | Top 5 | 0.8594 | 0.6719 | 0.8359 | 0.7786 | 0.9219 |

Évolution :

| Modèle | Précision avant -> après | MRR avant -> après |
| --- | --- | --- |
| OpenAI | 0.6703 -> 0.7063 | 0.7942 -> 0.8091 |
| MiniLM | 0.6281 -> 0.6719 | 0.7465 -> 0.7786 |

Le CrossEncoder est retenu par défaut, car il est local, stable et améliore le classement sans second appel LLM.

## 13. Reranking LLM

`LLMRerankerService` envoie les 10 candidats à `gpt-4o-mini`, exige un JSON contenant les indexes choisis et garde au plus cinq résultats.

Test qualitatif validé : 10 chunks récupérés, 5 sélectionnés pour la question `What is clean architecture?`.

| Option | Avantage | Limite |
| --- | --- | --- |
| CrossEncoder | local, gratuit, déterministe, adapté à la production | compréhension moins riche |
| LLM reranker | sélection sémantique plus flexible | latence, coût et second appel OpenAI |

Le LLM reranker reste une option pour les demandes complexes, pas le défaut.

## 14. Évaluation et génération des rapports

Ordre des scripts :

```powershell
python -m experiments.scripts.test_retrieval
python -m experiments.scripts.evaluate_retrieval
python -m experiments.scripts.test_reranking
python -m experiments.scripts.evaluate_retrieval
python -m experiments.scripts.generate_comparison_report
```

Le script `evaluate_retrieval.py` est actuellement configuré en dur pour lire `reranked_results.json` et écrire `reranked_evaluation_summary.*`. Pour reproduire l'évaluation embedding-only, il faut d'abord modifier ses constantes vers `retrieval_results.json` et `retrieval_evaluation_summary.*`, ou mieux ajouter des arguments CLI. Ne pas lancer deux fois la commande sans vérifier ces chemins.

## 15. Tests des services applicatifs

### Configuration et logs

```powershell
$env:PYTHONUTF8 = "1"
python -m tests.test_config
python -m tests.test_logger
```

Ces tests n'appellent pas OpenAI ni Qdrant.

### PostgreSQL

```powershell
python -m tests.test_postgres_engine
python -m tests.test_session
```

Ils nécessitent une base PostgreSQL active correspondant à `.env`.

### Embeddings et Qdrant

```powershell
python -m pytest tests/test_embedding_service.py -q
python -m pytest tests/test_qdrant_service.py -q
```

Le premier appelle OpenAI et peut télécharger MiniLM. Le second recrée la collection `test_app_qdrant_service` et y insère 10 points.

### Rerankers

```powershell
python -m pytest tests/test_reranker_service.py -q
python -m pytest tests/test_llm_reranker_service.py -q
```

Ils recréent des collections Qdrant dédiées. Le test LLM effectue aussi un appel de chat OpenAI.

### RAG bout en bout

```powershell
python -m pytest tests/test_rag_service.py -q
python -m pytest tests/test_langchain_rag_service.py -q
```

Ils préparent chacun 30 points, exécutent retrieval, reranking et génération, puis vérifient la présence de la réponse et des sources.

### FastAPI sans cloud

Les validations effectuées localement lors de la documentation ont vérifié :

- présence des six chemins OpenAPI (`/`, `/health` et quatre routes RAG) ;
- réponse de `/health` ;
- erreur `422` pour une question trop courte ;
- erreur `400` pour un reranker invalide ;
- compilation de tout le dossier `app`.

`tests/test_api.py` est encore vide : ces vérifications doivent être transformées en tests versionnés avec services mockés.

## 16. LangSmith

Les étapes suivantes ont été observées dans les traces :

```text
Answer question with RAG
Retrieve relevant chunks
Build RAG context
Generate answer with LangChain
ChatOpenAI
```

Trace rapportée : environ 14.90 s au total, dont 8.19 s pour le retrieval et 6.24 s pour la génération. La première requête paie le coût du chargement du CrossEncoder ; les services sont ensuite réutilisés grâce au cache FastAPI.

## 17. Problèmes rencontrés et corrections

| Problème | Cause | Correction |
| --- | --- | --- |
| venv cassé | ancien chemin Python | recréer l'environnement |
| `ModuleNotFoundError: app` | lancement d'un fichier de test directement | utiliser `python -m tests...` depuis la racine |
| `psql` introuvable | dossier PostgreSQL absent du PATH | ajouter `PostgreSQL/17/bin` |
| Nomic sans `einops` | dépendance du modèle manquante | installer/ajouter `einops` |
| `QdrantClient.search` absent | API différente dans la version installée | utiliser `query_points` |
| `vectors_count` absent | attribut non disponible | utiliser `points_count` et `status` |
| IDs golden incompatibles | questions manuelles vs IDs F/X/M/N | charger directement les 64 questions golden |
| labels @5 incorrects | K écrit en dur dans le rapport | détecter K depuis les résultats |
| bool LangSmith dans `os.environ` | variables d'environnement uniquement string | convertir avec `str(...).lower()` |
| clés partagées | secrets exposés pendant les essais | révoquer, régénérer et conserver uniquement dans `.env` |

## 18. Décision finale

```text
Embedding principal : OpenAI text-embedding-3-small
Alternative locale  : sentence-transformers/all-MiniLM-L6-v2
Vector store         : Qdrant
Retrieval            : Top 10
Reranker par défaut  : CrossEncoder MiniLM
Contexte final       : Top 5
LLM                   : gpt-4o-mini
Orchestration         : LangChain
Observabilité         : LangSmith
API                   : FastAPI
```

## 19. Limites et prochaines évaluations

1. Ajouter une vraie métrique page-level utilisant `relevant_chunks[].pages`.
2. Évaluer séparément factual, cross-doc, multi-hop et negative.
3. Calibrer le seuil négatif pour chaque modèle et mesurer le taux de refus correct.
4. Dédupliquer les fichiers lors du calcul du recall documentaire.
5. Ajouter faithfulness, correction factuelle, qualité des citations et groundedness pour la réponse finale.
6. Mesurer p50/p95 de latence à chaud et à froid, coûts OpenAI et mémoire du CrossEncoder.
7. Construire un corpus par projet avec isolation des données.
8. Versionner la configuration exacte de chaque expérience pour garantir la reproductibilité.
9. Ajouter des tests mockés afin que la CI ne dépende pas des clouds.
10. Conserver un jeu de test séparé des documents utilisés pour régler les paramètres.
