"""Architecture generation and compliance checks for Sprint 3."""

from app.agents.base import BaseAgent
from app.schemas.agents import (
    AgentFinding,
    AgentInput,
    AgentName,
    AgentResult,
    AgentStatus,
    ArchitectureBlueprint,
    ArchitectureComplianceCheck,
    ArchitectureComponent,
    ArchitectureFlow,
    ArchitectureProfile,
    ComplianceStatus,
    FindingSeverity,
    FindingSource,
)
from app.services.github_service import GitHubRepositoryService


class ArchitectureAgent(BaseAgent):
    """Creates a reproducible repository architecture; it never executes code."""

    name = AgentName.ARCHITECTURE
    SOURCE_EXTENSIONS = {
        ".py", ".java", ".js", ".jsx", ".ts", ".tsx", ".json", ".xml",
        ".properties", ".yml", ".yaml", ".md",
    }
    EXPECTED_AGENT_FILES = {
        "architecture_agent.py", "structure_agent.py", "context_agent.py", "quality_agent.py",
        "security_agent.py", "impact_agent.py", "documentation_agent.py", "todo_agent.py",
    }

    def __init__(self, repository_service: GitHubRepositoryService | None = None):
        self.repository_service = repository_service or GitHubRepositoryService()

    def run(self, request: AgentInput) -> AgentResult:
        snapshot = self.repository_snapshot(request, self.repository_service)
        texts = self.repository_text_files(request, self.repository_service, self.SOURCE_EXTENSIONS)
        paths = {item["path"].casefold() for item in snapshot.files}
        roots = {path.split("/", 1)[0] for path in paths if "/" in path}
        corpus = "\n".join(text.casefold() for text in texts.values())

        has_frontend = bool(roots & {"frontend", "client", "web", "ui"})
        has_backend = bool(roots & {"backend", "server", "api"})
        has_react = "react" in corpus or any(path.endswith((".jsx", ".tsx")) for path in paths)
        has_spring = "spring-boot" in corpus or ("pom.xml" in paths and any(path.endswith(".java") for path in paths))
        has_fastapi = "fastapi" in corpus or "fastapi(" in corpus
        has_postgres = "postgres" in corpus or "postgresql" in corpus
        has_qdrant = "qdrant" in corpus
        has_rag = has_qdrant and ("langchain" in corpus or "embedding" in corpus or "rag" in corpus)
        has_documents = any("document" in path for path in paths)
        has_reviews = any("review" in path for path in paths)
        has_todos = any("todo" in path for path in paths)
        readme_text = "\n".join(
            text.casefold()
            for path, text in texts.items()
            if path.rsplit("/", 1)[-1].casefold() in {"readme.md", "readme.mdx"}
        )
        architecture_docs = any(
            "architecture" in path or "/adr/" in f"/{path}" or path.startswith("docs/")
            for path in paths
        ) or (
            "architecture" in readme_text
            and ("```mermaid" in readme_text or "system overview" in readme_text)
        )
        has_infrastructure_file = bool(
            {"k8s", "infra"} & roots
            or any(path.endswith(("dockerfile", "docker-compose.yml", "docker-compose.yaml")) for path in paths)
        )
        deployment_documented = has_infrastructure_file or (
            ("setup" in readme_text or "installation" in readme_text)
            and ("uvicorn" in readme_text or "npm run" in readme_text or "docker" in readme_text)
        )
        agent_files = {
            path.rsplit("/", 1)[-1]
            for path in paths
            if "/agents/" in f"/{path}" and path.endswith("_agent.py")
        }
        implemented_agents = {
            path.rsplit("/", 1)[-1]
            for path, text in texts.items()
            if "/agents/" in f"/{path.casefold()}" and path.casefold().endswith("_agent.py") and text.strip()
        }

        components = self._components(
            has_frontend, has_react, has_backend, has_spring, has_fastapi,
            has_postgres, has_qdrant, has_rag, has_documents, agent_files,
        )
        flows = self._flows(has_frontend, has_backend, has_fastapi, has_postgres, has_qdrant)
        style = self._style(has_frontend, has_backend, has_fastapi)
        compliance = self._compliance_checks(
            request.architecture_profile, has_frontend and has_react, has_backend and has_spring,
            has_fastapi, has_postgres, has_qdrant, has_rag, has_documents,
            agent_files, implemented_agents, has_reviews and has_todos,
        )
        blueprint = ArchitectureBlueprint(
            style=style,
            components=components,
            flows=flows,
            mermaid_diagram=self._mermaid(components, flows),
            compliance_checks=compliance,
        )

        findings = self._findings(architecture_docs, has_frontend, has_backend, deployment_documented, compliance)
        profile_label = request.architecture_profile.value if request.architecture_profile else "générique"
        return AgentResult(
            agent=self.name,
            status=AgentStatus.COMPLETED,
            summary=(
                f"Architecture {profile_label} produite au commit {snapshot.commit_sha[:12]} : "
                f"style {style} ; {len(components)} composant(s), {len(flows)} flux et "
                f"{len(compliance)} contrôle(s) de conformité."
            ),
            findings=findings,
            architecture=blueprint,
        )

    @staticmethod
    def _components(has_frontend, has_react, has_backend, has_spring, has_fastapi, has_postgres, has_qdrant, has_rag, has_documents, agent_files):
        components: list[ArchitectureComponent] = []
        if has_frontend:
            components.append(ArchitectureComponent(name="Frontend", component_type="React" if has_react else "web frontend", evidence_paths=["frontend/"]))
        if has_backend:
            components.append(ArchitectureComponent(name="Backend", component_type="Spring Boot" if has_spring else "application backend", evidence_paths=["backend/"]))
        if has_fastapi:
            components.append(ArchitectureComponent(name="Service IA", component_type="FastAPI", evidence_paths=["FastAPI détecté dans le code/configuration"]))
        if has_postgres:
            components.append(ArchitectureComponent(name="PostgreSQL", component_type="database", evidence_paths=["configuration détectée"]))
        if has_qdrant:
            components.append(ArchitectureComponent(name="Qdrant", component_type="vector database", evidence_paths=["configuration détectée"]))
        if has_rag:
            components.append(ArchitectureComponent(name="Pipeline RAG", component_type="retrieval augmented generation", evidence_paths=["services RAG détectés"]))
        if has_documents:
            components.append(ArchitectureComponent(name="Gestion documentaire", component_type="project documents", evidence_paths=["document*"]))
        if agent_files:
            components.append(ArchitectureComponent(name="Agents d'analyse", component_type="multi-agent", evidence_paths=sorted(agent_files)[:20]))
        return components

    @staticmethod
    def _flows(has_frontend, has_backend, has_fastapi, has_postgres, has_qdrant):
        flows: list[ArchitectureFlow] = []
        if has_frontend and has_backend:
            flows.append(ArchitectureFlow(source="Frontend", target="Backend", protocol="REST/JSON", evidence="Répertoires frontend et backend détectés."))
        if has_backend and has_fastapi:
            flows.append(ArchitectureFlow(source="Backend", target="Service IA", protocol="HTTP interne", evidence="Composants backend et FastAPI détectés."))
        if has_backend and has_postgres:
            flows.append(ArchitectureFlow(source="Backend", target="PostgreSQL", protocol="JPA/SQL", evidence="Backend et configuration PostgreSQL détectés."))
        if has_fastapi and has_qdrant:
            flows.append(ArchitectureFlow(source="Service IA", target="Qdrant", protocol="Qdrant API", evidence="FastAPI et Qdrant détectés."))
        return flows

    @staticmethod
    def _style(has_frontend, has_backend, has_fastapi):
        if has_frontend and has_backend and has_fastapi:
            return "frontend + backend métier + microservice IA"
        if has_frontend and has_backend:
            return "application web séparée frontend/backend"
        if has_backend:
            return "backend applicatif"
        return "style non déterminé"

    @staticmethod
    def _mermaid(components, flows):
        lines = ["flowchart LR"]
        for index, component in enumerate(components, start=1):
            lines.append(f'    C{index}["{component.name}\\n{component.component_type}"]')
        component_ids = {component.name: f"C{index}" for index, component in enumerate(components, start=1)}
        for flow in flows:
            if flow.source in component_ids and flow.target in component_ids:
                lines.append(f'    {component_ids[flow.source]} -->|"{flow.protocol}"| {component_ids[flow.target]}')
        return "\n".join(lines)

    @classmethod
    def _compliance_checks(cls, profile, has_frontend, has_backend, has_fastapi, has_postgres, has_qdrant, has_rag, has_documents, agent_files, implemented_agents, has_human_review):
        if profile != ArchitectureProfile.ENGINEERING_COPILOT:
            return []
        source = FindingSource(source_type="project_specification", reference="Cahier des charges Engineering Copilot, figures architecture générale et orchestration multi-agents; backend/docs/ARCHITECTURE.md")
        checks = [
            cls._check("EC-01", "Frontend React séparé", has_frontend, "Frontend React détecté."),
            cls._check("EC-02", "API métier Spring Boot séparée", has_backend, "Backend Spring Boot détecté."),
            cls._check("EC-03", "Service IA FastAPI séparé", has_fastapi, "Service FastAPI détecté."),
            cls._check("EC-04", "Persistance PostgreSQL", has_postgres, "Configuration PostgreSQL détectée."),
            cls._check("EC-05", "Base vectorielle Qdrant", has_qdrant, "Configuration Qdrant détectée."),
            cls._check("EC-06", "Pipeline RAG avec sources", has_rag, "Indices RAG/embeddings et Qdrant détectés."),
            cls._check("EC-07", "Gestion documentaire par projet", has_documents, "Artefacts de gestion documentaire détectés."),
            cls._agent_check(agent_files, implemented_agents),
            cls._check("EC-09", "Validation humaine Review et TODO", has_human_review, "Composants Review et Todo détectés."),
        ]
        return [check.model_copy(update={"sources": [source]}) for check in checks]

    @staticmethod
    def _check(requirement_id, requirement, detected, positive_evidence):
        return ArchitectureComplianceCheck(
            requirement_id=requirement_id,
            requirement=requirement,
            status=ComplianceStatus.COMPLIANT if detected else ComplianceStatus.MISSING,
            evidence=positive_evidence if detected else "Aucune preuve suffisante n'a été détectée dans le périmètre lu.",
            recommendation=None if detected else f"Implémenter ou documenter explicitement : {requirement}.",
        )

    @classmethod
    def _agent_check(cls, agent_files, implemented_agents):
        missing_files = sorted(cls.EXPECTED_AGENT_FILES - agent_files)
        missing_implementations = sorted(cls.EXPECTED_AGENT_FILES - implemented_agents)
        if not missing_files and not missing_implementations:
            status = ComplianceStatus.COMPLIANT
            evidence = "Les huit agents attendus sont présents et non vides."
            recommendation = None
        elif not missing_files:
            status = ComplianceStatus.PARTIAL
            evidence = f"Les huit fichiers existent, mais les agents suivants restent non implémentés : {', '.join(missing_implementations)}."
            recommendation = "Implémenter les agents restants avant l'intégration SAE–IA."
        else:
            status = ComplianceStatus.MISSING
            evidence = f"Agents absents : {', '.join(missing_files)}."
            recommendation = "Créer les huit agents définis dans l'architecture multi-agents."
        return ArchitectureComplianceCheck(
            requirement_id="EC-08",
            requirement="Huit agents spécialisés et orchestrateur",
            status=status,
            evidence=evidence,
            recommendation=recommendation,
        )

    @staticmethod
    def _findings(architecture_docs, has_frontend, has_backend, deployment_documented, compliance):
        source = FindingSource(source_type="standard_document", reference="architecture/Clean Architecture A Craftsman's Guide to Software Structure and Design.pdf; architecture/hexagonal-architectures.pdf")
        findings: list[AgentFinding] = []
        if not architecture_docs:
            findings.append(AgentFinding(title="Décisions d'architecture non documentées", severity=FindingSeverity.LOW, confidence=0.75, evidence="Aucun document d'architecture, dossier docs ou ADR n'a été détecté dans le périmètre lu.", recommendation="Ajouter un schéma des composants, les flux principaux et des ADR pour les décisions structurantes.", sources=[source]))
        if has_frontend and has_backend and not deployment_documented:
            findings.append(AgentFinding(title="Contrat de déploiement non visible dans le dépôt", severity=FindingSeverity.LOW, confidence=0.65, evidence="Des zones frontend et backend sont détectées, sans fichier Docker, compose, k8s ou infra autorisé visible.", recommendation="Documenter au minimum les variables d'environnement, les ports, le démarrage local et le déploiement des services.", sources=[source]))
        for check in compliance:
            if check.status in {ComplianceStatus.MISSING, ComplianceStatus.PARTIAL}:
                findings.append(AgentFinding(title=f"Conformité {check.requirement_id} : {check.requirement}", severity=FindingSeverity.MEDIUM if check.status == ComplianceStatus.MISSING else FindingSeverity.LOW, confidence=0.85, evidence=check.evidence, recommendation=check.recommendation, sources=check.sources))
        return findings
