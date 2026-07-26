import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  FolderGit2,
  FolderKanban,
  PencilLine,
  Settings2,
  Trash2,
  UsersRound
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { DeleteDocumentDialog } from '../components/document/DeleteDocumentDialog';
import { DocumentCard } from '../components/document/DocumentCard';
import { DocumentFormModal } from '../components/document/DocumentFormModal';
import { DocumentTable } from '../components/document/DocumentTable';
import { DeleteDocumentationDialog } from '../components/documentation/DeleteDocumentationDialog';
import { DocumentationCard } from '../components/documentation/DocumentationCard';
import { DocumentationFormModal } from '../components/documentation/DocumentationFormModal';
import { DocumentationTable } from '../components/documentation/DocumentationTable';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { DeleteRepositoryDialog } from '../components/repository/DeleteRepositoryDialog';
import { RepositoryCard } from '../components/repository/RepositoryCard';
import { RepositoryFormModal } from '../components/repository/RepositoryFormModal';
import { RepositoryTable } from '../components/repository/RepositoryTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog';
import { ProjectFormModal } from '../components/project/ProjectFormModal';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { formatDate } from '../lib/formatters';
import { formatProjectStatus, getProjectStatusTone } from '../lib/project';
import { adminDocumentService } from '../services/adminDocumentService';
import { adminDocumentationService } from '../services/adminDocumentationService';
import { adminProjectService } from '../services/adminProjectService';
import { adminRepositoryService } from '../services/adminRepositoryService';
import { adminTeamService } from '../services/adminTeamService';
import type {
  CreateDocumentPayload,
  DocumentProjectSummary,
  SourceDocument,
  UpdateDocumentPayload
} from '../types/document';
import type {
  CreateDocumentationPayload,
  Documentation as ProjectDocumentation,
  DocumentationProjectSummary,
  UpdateDocumentationPayload
} from '../types/documentation';
import type { Project, ProjectTeamSummary, UpdateProjectPayload } from '../types/project';
import type {
  CodeRepository,
  CreateRepositoryPayload,
  RepositoryProjectSummary,
  UpdateRepositoryPayload
} from '../types/repository';

type ProjectTabId = 'overview' | 'team' | 'repositories' | 'documents' | 'documentation' | 'settings';

const projectTabs: Array<{ id: ProjectTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'team', label: 'Team' },
  { id: 'repositories', label: 'Repositories' },
  { id: 'documents', label: 'Documents' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'settings', label: 'Settings' }
];

export function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<ProjectTeamSummary[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [repositories, setRepositories] = useState<CodeRepository[]>([]);
  const [loadingRepositories, setLoadingRepositories] = useState(true);
  const [repositoriesError, setRepositoriesError] = useState<string | null>(null);
  const [repositorySubmitting, setRepositorySubmitting] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<CodeRepository | null>(null);
  const [repositoryCreateOpen, setRepositoryCreateOpen] = useState(false);
  const [repositoryEditOpen, setRepositoryEditOpen] = useState(false);
  const [repositoryDeleteOpen, setRepositoryDeleteOpen] = useState(false);
  const [repositorySortBy, setRepositorySortBy] = useState('createdAt');
  const [repositorySortDirection, setRepositorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentSubmitting, setDocumentSubmitting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(null);
  const [documentCreateOpen, setDocumentCreateOpen] = useState(false);
  const [documentEditOpen, setDocumentEditOpen] = useState(false);
  const [documentDeleteOpen, setDocumentDeleteOpen] = useState(false);
  const [documentSortBy, setDocumentSortBy] = useState('createdAt');
  const [documentSortDirection, setDocumentSortDirection] = useState<'asc' | 'desc'>('desc');
  const [documentationEntries, setDocumentationEntries] = useState<ProjectDocumentation[]>([]);
  const [loadingDocumentation, setLoadingDocumentation] = useState(true);
  const [documentationError, setDocumentationError] = useState<string | null>(null);
  const [documentationSubmitting, setDocumentationSubmitting] = useState(false);
  const [selectedDocumentation, setSelectedDocumentation] = useState<ProjectDocumentation | null>(null);
  const [documentationCreateOpen, setDocumentationCreateOpen] = useState(false);
  const [documentationEditOpen, setDocumentationEditOpen] = useState(false);
  const [documentationDeleteOpen, setDocumentationDeleteOpen] = useState(false);
  const [documentationSortBy, setDocumentationSortBy] = useState('createdAt');
  const [documentationSortDirection, setDocumentationSortDirection] = useState<'asc' | 'desc'>('desc');

  const projectId = Number(id);
  const canManageProjects = currentUser?.role === 'ADMIN';
  const canOpenTeamWorkspace = currentUser?.role === 'ADMIN';
  const canManageDocumentation = currentUser?.role === 'ADMIN' || currentUser?.role === 'ARCHITECT';
  const canDeleteDocumentation = currentUser?.role === 'ADMIN';

  const loadProject = async () => {
    if (!Number.isFinite(projectId)) {
      setError('The requested project id is invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await adminProjectService.getProjectById(projectId);
      setProject(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    if (!canManageProjects) {
      return;
    }

    setLoadingTeams(true);

    try {
      const response = await adminTeamService.getTeams({
        page: 0,
        size: 100,
        sortBy: 'teamName',
        sortDirection: 'asc'
      });

      setTeams(
        response.content.map((team) => ({
          id: team.id,
          teamName: team.teamName,
          description: team.description
        }))
      );
    } catch (teamError) {
      setTeams([]);
      showToast({
        type: 'error',
        title: 'Unable to load teams',
        description: getApiErrorMessage(teamError)
      });
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadRepositories = async () => {
    if (!Number.isFinite(projectId)) {
      setRepositories([]);
      setRepositoriesError('The requested project id is invalid.');
      setLoadingRepositories(false);
      return;
    }

    setLoadingRepositories(true);

    try {
      const response = await adminRepositoryService.getRepositoriesByProjectId(projectId);
      setRepositories(response);
      setRepositoriesError(null);
    } catch (loadRepositoriesError) {
      setRepositories([]);
      setRepositoriesError(getApiErrorMessage(loadRepositoriesError));
    } finally {
      setLoadingRepositories(false);
    }
  };

  const loadDocuments = async () => {
    if (!Number.isFinite(projectId)) {
      setDocuments([]);
      setDocumentsError('The requested project id is invalid.');
      setLoadingDocuments(false);
      return;
    }

    setLoadingDocuments(true);

    try {
      const response = await adminDocumentService.getDocumentsByProjectId(projectId);
      setDocuments(response);
      setDocumentsError(null);
    } catch (loadDocumentsError) {
      setDocuments([]);
      setDocumentsError(getApiErrorMessage(loadDocumentsError));
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadDocumentation = async () => {
    if (!Number.isFinite(projectId)) {
      setDocumentationEntries([]);
      setDocumentationError('The requested project id is invalid.');
      setLoadingDocumentation(false);
      return;
    }

    setLoadingDocumentation(true);

    try {
      const response = await adminDocumentationService.getDocumentationByProjectId(projectId);
      setDocumentationEntries(response);
      setDocumentationError(null);
    } catch (loadDocumentationError) {
      setDocumentationEntries([]);
      setDocumentationError(getApiErrorMessage(loadDocumentationError));
    } finally {
      setLoadingDocumentation(false);
    }
  };

  useEffect(() => {
    void loadProject();
    void loadRepositories();
    void loadDocuments();
    void loadDocumentation();
  }, [projectId]);

  useEffect(() => {
    if (canManageProjects) {
      void loadTeams();
    }
  }, [canManageProjects]);

  const handleEditSubmit = async (payload: UpdateProjectPayload) => {
    if (!project) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedProject = await adminProjectService.updateProject(project.id, payload);
      setProject(updatedProject);
      setEditOpen(false);
      showToast({
        type: 'success',
        title: 'Project updated',
        description: `${updatedProject.title} was updated successfully.`
      });
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRepository = async (payload: CreateRepositoryPayload) => {
    setRepositorySubmitting(true);

    try {
      await adminRepositoryService.createRepository(payload);
      setRepositoryCreateOpen(false);
      showToast({
        type: 'success',
        title: 'Repository created',
        description: `${payload.name} was linked to ${project?.title ?? 'the project'} successfully.`
      });
      await loadRepositories();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create repository',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setRepositorySubmitting(false);
    }
  };

  const handleEditRepository = async (payload: UpdateRepositoryPayload) => {
    if (!selectedRepository) {
      return;
    }

    setRepositorySubmitting(true);

    try {
      await adminRepositoryService.updateRepository(selectedRepository.id, payload);
      setRepositoryEditOpen(false);
      showToast({
        type: 'success',
        title: 'Repository updated',
        description: `${payload.name} was updated successfully.`
      });
      await loadRepositories();
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setRepositorySubmitting(false);
    }
  };

  const handleDeleteRepository = async () => {
    if (!selectedRepository) {
      return;
    }

    setRepositorySubmitting(true);

    try {
      await adminRepositoryService.deleteRepository(selectedRepository.id);
      setRepositoryDeleteOpen(false);
      setSelectedRepository(null);
      showToast({
        type: 'success',
        title: 'Repository deleted',
        description: `${selectedRepository.name} has been removed from ${project?.title ?? 'this project'}.`
      });
      await loadRepositories();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setRepositorySubmitting(false);
    }
  };

  const openRepositoryUrl = (repository: CodeRepository) => {
    window.open(repository.url, '_blank', 'noopener,noreferrer');
  };

  const openDocumentPath = (document: SourceDocument) => {
    navigate(`/dashboard/documents/${document.id}`);
  };

  const openDocumentationPath = (documentation: ProjectDocumentation) => {
    navigate(`/dashboard/documentation/${documentation.id}`);
  };

  const handleRepositorySort = (field: string) => {
    setRepositorySortBy(field);
    setRepositorySortDirection((currentDirection) =>
      repositorySortBy === field && currentDirection === 'asc' ? 'desc' : 'asc'
    );
  };

  const handleDocumentSort = (field: string) => {
    setDocumentSortBy(field);
    setDocumentSortDirection((currentDirection) =>
      documentSortBy === field && currentDirection === 'asc' ? 'desc' : 'asc'
    );
  };

  const handleDocumentationSort = (field: string) => {
    setDocumentationSortBy(field);
    setDocumentationSortDirection((currentDirection) =>
      documentationSortBy === field && currentDirection === 'asc' ? 'desc' : 'asc'
    );
  };

  const handleCreateDocument = async (payload: CreateDocumentPayload) => {
    setDocumentSubmitting(true);

    try {
      await adminDocumentService.createDocument(payload);
      setDocumentCreateOpen(false);
      showToast({
        type: 'success',
        title: 'Document created',
        description: `${payload.title} was linked to ${project?.title ?? 'the project'} successfully.`
      });
      await loadDocuments();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create document',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setDocumentSubmitting(false);
    }
  };

  const handleEditDocument = async (payload: UpdateDocumentPayload) => {
    if (!selectedDocument) {
      return;
    }

    setDocumentSubmitting(true);

    try {
      await adminDocumentService.updateDocument(selectedDocument.id, payload);
      setDocumentEditOpen(false);
      showToast({
        type: 'success',
        title: 'Document updated',
        description: `${payload.title} was updated successfully.`
      });
      await loadDocuments();
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setDocumentSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) {
      return;
    }

    setDocumentSubmitting(true);

    try {
      await adminDocumentService.deleteDocument(selectedDocument.id);
      setDocumentDeleteOpen(false);
      setSelectedDocument(null);
      showToast({
        type: 'success',
        title: 'Document deleted',
        description: `${selectedDocument.title} has been removed from ${project?.title ?? 'this project'}.`
      });
      await loadDocuments();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setDocumentSubmitting(false);
    }
  };

  const handleCreateDocumentation = async (payload: CreateDocumentationPayload) => {
    setDocumentationSubmitting(true);

    try {
      await adminDocumentationService.createDocumentation(payload);
      setDocumentationCreateOpen(false);
      showToast({
        type: 'success',
        title: 'Documentation created',
        description: `${payload.title} was linked to ${project?.title ?? 'the project'} successfully.`
      });
      await loadDocumentation();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create documentation',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setDocumentationSubmitting(false);
    }
  };

  const handleEditDocumentation = async (payload: UpdateDocumentationPayload) => {
    if (!selectedDocumentation) {
      return;
    }

    setDocumentationSubmitting(true);

    try {
      await adminDocumentationService.updateDocumentation(selectedDocumentation.id, payload);
      setDocumentationEditOpen(false);
      showToast({
        type: 'success',
        title: 'Documentation updated',
        description: `${payload.title} was updated successfully.`
      });
      await loadDocumentation();
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setDocumentationSubmitting(false);
    }
  };

  const handleDeleteDocumentation = async () => {
    if (!selectedDocumentation) {
      return;
    }

    setDocumentationSubmitting(true);

    try {
      await adminDocumentationService.deleteDocumentation(selectedDocumentation.id);
      setDocumentationDeleteOpen(false);
      setSelectedDocumentation(null);
      showToast({
        type: 'success',
        title: 'Documentation deleted',
        description: `${selectedDocumentation.title} has been removed from ${project?.title ?? 'this project'}.`
      });
      await loadDocumentation();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setDocumentationSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) {
      return;
    }

    setSubmitting(true);

    try {
      await adminProjectService.deleteProject(project.id);
      showToast({
        type: 'success',
        title: 'Project deleted',
        description: `${project.title} has been removed.`
      });
      navigate('/dashboard/projects');
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-16 w-48" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <ErrorState
        actionLabel="Reload project"
        description={error ?? 'Unable to load the requested project.'}
        onAction={() => {
          void loadProject();
        }}
        title="Project details unavailable"
      />
    );
  }

  const repositoryProjects: RepositoryProjectSummary[] = project
    ? [
        {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        }
      ]
    : [];

  const documentProjects: DocumentProjectSummary[] = project
    ? [
        {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        }
      ]
    : [];

  const documentationProjects: DocumentationProjectSummary[] = project
    ? [
        {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        }
      ]
    : [];

  const sortedRepositories = [...repositories].sort((left, right) => {
    const directionMultiplier = repositorySortDirection === 'asc' ? 1 : -1;

    if (repositorySortBy === 'createdAt') {
      const leftDate = Date.parse(left.createdAt);
      const rightDate = Date.parse(right.createdAt);
      return (leftDate - rightDate) * directionMultiplier;
    }

    const leftValue =
      repositorySortBy === 'provider'
        ? left.provider
        : repositorySortBy === 'technology'
          ? left.technology ?? ''
          : repositorySortBy === 'branch'
            ? left.branch ?? 'main'
            : left.name;
    const rightValue =
      repositorySortBy === 'provider'
        ? right.provider
        : repositorySortBy === 'technology'
          ? right.technology ?? ''
          : repositorySortBy === 'branch'
            ? right.branch ?? 'main'
            : right.name;

    return leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' }) * directionMultiplier;
  });

  const sortedDocuments = [...documents].sort((left, right) => {
    const directionMultiplier = documentSortDirection === 'asc' ? 1 : -1;

    if (documentSortBy === 'createdAt') {
      const leftDate = Date.parse(left.createdAt);
      const rightDate = Date.parse(right.createdAt);
      return (leftDate - rightDate) * directionMultiplier;
    }

    const leftValue =
      documentSortBy === 'type'
        ? left.type
        : documentSortBy === 'source'
          ? left.source ?? ''
          : left.title;
    const rightValue =
      documentSortBy === 'type'
        ? right.type
        : documentSortBy === 'source'
          ? right.source ?? ''
          : right.title;

    return leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' }) * directionMultiplier;
  });

  const sortedDocumentation = [...documentationEntries].sort((left, right) => {
    const directionMultiplier = documentationSortDirection === 'asc' ? 1 : -1;

    if (documentationSortBy === 'createdAt') {
      const leftDate = Date.parse(left.createdAt);
      const rightDate = Date.parse(right.createdAt);
      return (leftDate - rightDate) * directionMultiplier;
    }

    const leftValue =
      documentationSortBy === 'type'
        ? left.type
        : documentationSortBy === 'status'
          ? left.status
          : left.title;
    const rightValue =
      documentationSortBy === 'type'
        ? right.type
        : documentationSortBy === 'status'
          ? right.status
          : right.title;

    return leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' }) * directionMultiplier;
  });

  return (
    <div className="space-y-6">
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
        onClick={() => navigate('/dashboard/projects')}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </button>

      <section className="page-shell flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">Project workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{project.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge label={formatProjectStatus(project.status)} tone={getProjectStatusTone(project.status)} />
            <span className="text-sm text-slate-500 dark:text-slate-400">Owned by {project.team.teamName}</span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            {project.description || 'No description has been provided for this project yet.'}
          </p>
        </div>

        {canManageProjects ? (
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
              onClick={() => setEditOpen(true)}
              type="button"
            >
              <PencilLine className="h-4 w-4" />
              Edit project
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <FolderKanban className="h-5 w-5" />
            <p className="font-semibold text-white">Status</p>
          </div>
          <div className="mt-4">
            <StatusBadge label={formatProjectStatus(project.status)} tone={getProjectStatusTone(project.status)} />
          </div>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <UsersRound className="h-5 w-5" />
            <p className="font-semibold text-white">Team</p>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">{project.team.teamName}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Created</p>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">{formatDate(project.createdAt)}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3 text-brand-300">
            <CalendarClock className="h-5 w-5" />
            <p className="font-semibold text-white">Updated</p>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">{formatDate(project.updatedAt)}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-wrap gap-3">
          {projectTabs.map((tab) => (
            <button
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'border border-white/10 bg-slate-950/70 text-slate-200 hover:border-brand-400/30 hover:text-brand-200'
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Overview</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Project summary</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {project.description || 'No description has been provided for this project yet.'}
              </p>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Metadata</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Lifecycle details</h2>
              <dl className="mt-6 space-y-4 text-sm text-slate-300">
                <div>
                  <dt className="text-slate-500">Project id</dt>
                  <dd className="mt-1 font-semibold text-white">#{project.id}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Assigned team</dt>
                  <dd className="mt-1 font-semibold text-white">{project.team.teamName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created at</dt>
                  <dd className="mt-1 font-semibold text-white">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Updated at</dt>
                  <dd className="mt-1 font-semibold text-white">{formatDate(project.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          </div>
        ) : null}

        {activeTab === 'team' ? (
          <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Team assignment</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{project.team.teamName}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  {project.team.description || 'No team description is available for this project assignment yet.'}
                </p>
              </div>

              {canOpenTeamWorkspace ? (
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/40 hover:text-brand-200"
                  onClick={() => navigate(`/dashboard/teams/${project.team.id}`)}
                  type="button"
                >
                  <UsersRound className="h-4 w-4" />
                  Open team
                </button>
              ) : null}
            </div>
          </article>
        ) : null}

        {activeTab === 'repositories' ? (
          <article className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Project repositories</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Connected repository metadata</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                  Track the repositories linked to this project, including provider, branch, technology, and external URL.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
                  {repositories.length} repositories linked
                </div>
                {canManageProjects ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                    onClick={() => setRepositoryCreateOpen(true)}
                    type="button"
                  >
                    <FolderGit2 className="h-4 w-4" />
                    Add Repository
                  </button>
                ) : null}
              </div>
            </div>

            {loadingRepositories ? (
              <div className="space-y-4">
                <LoadingSkeleton className="h-24 w-full" />
                <LoadingSkeleton className="h-56 w-full" />
              </div>
            ) : repositoriesError ? (
              <ErrorState
                actionLabel="Reload repositories"
                description={repositoriesError}
                onAction={() => {
                  void loadRepositories();
                }}
                title="Unable to load project repositories"
              />
            ) : repositories.length === 0 ? (
              <div className="space-y-5">
                <EmptyState
                  description="This project does not have any repositories linked yet."
                  title="No repositories linked"
                />
                {canManageProjects ? (
                  <div className="flex justify-center">
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                      onClick={() => setRepositoryCreateOpen(true)}
                      type="button"
                    >
                      <FolderGit2 className="h-4 w-4" />
                      Add the first repository
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <RepositoryTable
                    canManageRepositories={canManageProjects}
                    onDelete={(repository) => {
                      setSelectedRepository(repository);
                      setRepositoryDeleteOpen(true);
                    }}
                    onEdit={(repository) => {
                      setSelectedRepository(repository);
                      setRepositoryEditOpen(true);
                    }}
                    onOpenUrl={openRepositoryUrl}
                    onSort={handleRepositorySort}
                    onViewDetails={(repository) => navigate(`/dashboard/repositories/${repository.id}`)}
                    onViewProject={() => undefined}
                    repositories={sortedRepositories}
                    showProjectColumn={false}
                    showViewProjectAction={false}
                    sortBy={repositorySortBy}
                    sortDirection={repositorySortDirection}
                  />
                </div>

                <div className="grid gap-4 xl:hidden">
                  {sortedRepositories.map((repository) => (
                    <RepositoryCard
                      canManageRepositories={canManageProjects}
                      key={repository.id}
                      onDelete={() => {
                        setSelectedRepository(repository);
                        setRepositoryDeleteOpen(true);
                      }}
                      onEdit={() => {
                        setSelectedRepository(repository);
                        setRepositoryEditOpen(true);
                      }}
                      onOpenUrl={() => openRepositoryUrl(repository)}
                      onViewDetails={() => navigate(`/dashboard/repositories/${repository.id}`)}
                      onViewProject={() => undefined}
                      repository={repository}
                      showProjectMeta={false}
                      showViewProjectAction={false}
                    />
                  ))}
                </div>
              </>
            )}
          </article>
        ) : null}

        {activeTab === 'documents' ? (
          <article className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Project documents</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Connected source document metadata</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                  Track standards, architecture references, internal norms, and technical guides linked to this project.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
                  {documents.length} documents linked
                </div>
                {canManageProjects ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                    onClick={() => setDocumentCreateOpen(true)}
                    type="button"
                  >
                    <FileText className="h-4 w-4" />
                    Add Document
                  </button>
                ) : null}
              </div>
            </div>

            {loadingDocuments ? (
              <div className="space-y-4">
                <LoadingSkeleton className="h-24 w-full" />
                <LoadingSkeleton className="h-56 w-full" />
              </div>
            ) : documentsError ? (
              <ErrorState
                actionLabel="Reload documents"
                description={documentsError}
                onAction={() => {
                  void loadDocuments();
                }}
                title="Unable to load project documents"
              />
            ) : documents.length === 0 ? (
              <div className="space-y-5">
                <EmptyState
                  description="This project does not have any documents linked yet."
                  title="No documents linked"
                />
                {canManageProjects ? (
                  <div className="flex justify-center">
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                      onClick={() => setDocumentCreateOpen(true)}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      Add the first document
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <DocumentTable
                    canManageDocuments={canManageProjects}
                    documents={sortedDocuments}
                    onDelete={(document) => {
                      setSelectedDocument(document);
                      setDocumentDeleteOpen(true);
                    }}
                    onEdit={(document) => {
                      setSelectedDocument(document);
                      setDocumentEditOpen(true);
                    }}
                    onOpenPath={openDocumentPath}
                    onSort={handleDocumentSort}
                    onViewDetails={(document) => navigate(`/dashboard/documents/${document.id}`)}
                    onViewProject={() => undefined}
                    showProjectColumn={false}
                    showViewProjectAction={false}
                    sortBy={documentSortBy}
                    sortDirection={documentSortDirection}
                  />
                </div>

                <div className="grid gap-4 xl:hidden">
                  {sortedDocuments.map((document) => (
                    <DocumentCard
                      canManageDocuments={canManageProjects}
                      document={document}
                      key={document.id}
                      onDelete={() => {
                        setSelectedDocument(document);
                        setDocumentDeleteOpen(true);
                      }}
                      onEdit={() => {
                        setSelectedDocument(document);
                        setDocumentEditOpen(true);
                      }}
                      onOpenPath={() => openDocumentPath(document)}
                      onViewDetails={() => navigate(`/dashboard/documents/${document.id}`)}
                      onViewProject={() => undefined}
                      showProjectMeta={false}
                      showViewProjectAction={false}
                    />
                  ))}
                </div>
              </>
            )}
          </article>
        ) : null}

        {activeTab === 'documentation' ? (
          <article className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Project documentation</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Documentation deliverables</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                  Track README files, API guides, architecture notes, onboarding assets, and technical reports linked to this project.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
                  {documentationEntries.length} deliverables linked
                </div>
                {canManageDocumentation ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                    onClick={() => setDocumentationCreateOpen(true)}
                    type="button"
                  >
                    <FileText className="h-4 w-4" />
                    Add Documentation
                  </button>
                ) : null}
              </div>
            </div>

            {loadingDocumentation ? (
              <div className="space-y-4">
                <LoadingSkeleton className="h-24 w-full" />
                <LoadingSkeleton className="h-56 w-full" />
              </div>
            ) : documentationError ? (
              <ErrorState
                actionLabel="Reload documentation"
                description={documentationError}
                onAction={() => {
                  void loadDocumentation();
                }}
                title="Unable to load project documentation"
              />
            ) : documentationEntries.length === 0 ? (
              <div className="space-y-5">
                <EmptyState
                  description="This project does not have any documentation deliverables linked yet."
                  title="No documentation linked"
                />
                {canManageDocumentation ? (
                  <div className="flex justify-center">
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                      onClick={() => setDocumentationCreateOpen(true)}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      Add the first deliverable
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <DocumentationTable
                    canDeleteDocumentation={canDeleteDocumentation}
                    canManageDocumentation={canManageDocumentation}
                    documentation={sortedDocumentation}
                    onDelete={(documentation) => {
                      setSelectedDocumentation(documentation);
                      setDocumentationDeleteOpen(true);
                    }}
                    onEdit={(documentation) => {
                      setSelectedDocumentation(documentation);
                      setDocumentationEditOpen(true);
                    }}
                    onOpenPath={openDocumentationPath}
                    onSort={handleDocumentationSort}
                    onViewDetails={(documentation) => navigate(`/dashboard/documentation/${documentation.id}`)}
                    onViewProject={() => undefined}
                    showProjectColumn={false}
                    showViewProjectAction={false}
                    sortBy={documentationSortBy}
                    sortDirection={documentationSortDirection}
                  />
                </div>

                <div className="grid gap-4 xl:hidden">
                  {sortedDocumentation.map((documentation) => (
                    <DocumentationCard
                      canDeleteDocumentation={canDeleteDocumentation}
                      canManageDocumentation={canManageDocumentation}
                      documentation={documentation}
                      key={documentation.id}
                      onDelete={() => {
                        setSelectedDocumentation(documentation);
                        setDocumentationDeleteOpen(true);
                      }}
                      onEdit={() => {
                        setSelectedDocumentation(documentation);
                        setDocumentationEditOpen(true);
                      }}
                      onOpenPath={() => openDocumentationPath(documentation)}
                      onViewDetails={() => navigate(`/dashboard/documentation/${documentation.id}`)}
                      onViewProject={() => undefined}
                      showProjectMeta={false}
                      showViewProjectAction={false}
                    />
                  ))}
                </div>
              </>
            )}
          </article>
        ) : null}

        {activeTab === 'settings' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
            <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 text-brand-300">
                <Settings2 className="h-5 w-5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">Settings</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Project configuration</h2>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                This section is reserved for future project governance controls, assignment rules, and workspace preferences.
              </p>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 text-brand-300">
                <FolderGit2 className="h-5 w-5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">Scope</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Current boundaries</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                <p>Repositories: metadata CRUD is available from this workspace</p>
                <p>Documents: metadata CRUD is available from this workspace</p>
                <p>Documentation: deliverable CRUD is available from this workspace</p>
                <p>Analysis settings: handled through the analysis workflow</p>
              </div>
            </article>
          </div>
        ) : null}
      </section>

      {canManageProjects ? (
        <>
          <ProjectFormModal
            loading={submitting}
            loadingTeams={loadingTeams}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => {
              void handleEditSubmit(payload);
            }}
            open={editOpen}
            project={project}
            subtitle="Update project naming, scope notes, team ownership, and lifecycle stage."
            teams={teams}
            title="Edit project"
          />

          <DeleteProjectDialog
            loading={submitting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              void handleDeleteProject();
            }}
            open={deleteOpen}
            project={project}
          />

          <RepositoryFormModal
            fixedProjectId={project.id}
            loading={repositorySubmitting}
            onClose={() => setRepositoryCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateRepository(payload);
            }}
            open={repositoryCreateOpen}
            projects={repositoryProjects}
            subtitle="Attach a repository to this project without enabling provider sync or code analysis yet."
            title="Add repository"
          />

          <RepositoryFormModal
            fixedProjectId={project.id}
            loading={repositorySubmitting}
            onClose={() => {
              setRepositoryEditOpen(false);
              setSelectedRepository(null);
            }}
            onSubmit={(payload) => {
              void handleEditRepository(payload);
            }}
            open={repositoryEditOpen}
            projects={repositoryProjects}
            repository={selectedRepository}
            subtitle="Update the repository metadata linked to this project."
            title="Edit repository"
          />

          <DeleteRepositoryDialog
            loading={repositorySubmitting}
            onCancel={() => {
              setRepositoryDeleteOpen(false);
              setSelectedRepository(null);
            }}
            onConfirm={() => {
              void handleDeleteRepository();
            }}
            open={repositoryDeleteOpen}
            repository={selectedRepository}
          />

          <DocumentFormModal
            fixedProjectId={project.id}
            loading={documentSubmitting}
            onClose={() => setDocumentCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateDocument(payload);
            }}
            open={documentCreateOpen}
            projects={documentProjects}
            subtitle="Attach source document metadata, file path, and source details to this project."
            title="Add document"
          />

          <DocumentFormModal
            document={selectedDocument}
            fixedProjectId={project.id}
            loading={documentSubmitting}
            onClose={() => {
              setDocumentEditOpen(false);
              setSelectedDocument(null);
            }}
            onSubmit={(payload) => {
              void handleEditDocument(payload);
            }}
            open={documentEditOpen}
            projects={documentProjects}
            subtitle="Update the source document metadata linked to this project."
            title="Edit document"
          />

          <DeleteDocumentDialog
            document={selectedDocument}
            loading={documentSubmitting}
            onCancel={() => {
              setDocumentDeleteOpen(false);
              setSelectedDocument(null);
            }}
            onConfirm={() => {
              void handleDeleteDocument();
            }}
            open={documentDeleteOpen}
          />
        </>
      ) : null}

      {canManageDocumentation ? (
        <>
          <DocumentationFormModal
            fixedProjectId={project.id}
            loading={documentationSubmitting}
            onClose={() => setDocumentationCreateOpen(false)}
            onSubmit={(payload) => {
              void handleCreateDocumentation(payload);
            }}
            open={documentationCreateOpen}
            projects={documentationProjects}
            subtitle="Attach documentation content, status, path, and approval metadata to this project."
            title="Add documentation"
          />

          <DocumentationFormModal
            documentation={selectedDocumentation}
            fixedProjectId={project.id}
            loading={documentationSubmitting}
            onClose={() => {
              setDocumentationEditOpen(false);
              setSelectedDocumentation(null);
            }}
            onSubmit={(payload) => {
              void handleEditDocumentation(payload);
            }}
            open={documentationEditOpen}
            projects={documentationProjects}
            subtitle="Update the documentation content, status, review flags, path, and type linked to this project."
            title="Edit documentation"
          />
        </>
      ) : null}

      {canDeleteDocumentation ? (
        <DeleteDocumentationDialog
          documentation={selectedDocumentation}
          loading={documentationSubmitting}
          onCancel={() => {
            setDocumentationDeleteOpen(false);
            setSelectedDocumentation(null);
          }}
          onConfirm={() => {
            void handleDeleteDocumentation();
          }}
          open={documentationDeleteOpen}
        />
      ) : null}
    </div>
  );
}
