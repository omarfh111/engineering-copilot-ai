import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, LoaderCircle, X } from 'lucide-react';
import {
  documentationStatusOptions,
  documentationTypeOptions,
  formatDocumentationStatus,
  formatDocumentationType
} from '../../lib/documentation';
import type {
  CreateDocumentationPayload,
  Documentation,
  DocumentationProjectSummary,
  DocumentationStatus,
  DocumentationType,
  UpdateDocumentationPayload
} from '../../types/documentation';

interface DocumentationFormModalProps {
  open: boolean;
  loading: boolean;
  loadingProjects?: boolean;
  title: string;
  subtitle: string;
  documentation?: Documentation | null;
  projects: DocumentationProjectSummary[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateDocumentationPayload | UpdateDocumentationPayload) => void;
}

interface DocumentationFormValues {
  title: string;
  description: string;
  type: DocumentationType | '';
  content: string;
  path: string;
  status: DocumentationStatus | '';
  generatedByAI: boolean;
  approved: boolean;
  projectId: string;
}

const defaultValues: DocumentationFormValues = {
  title: '',
  description: '',
  type: '',
  content: '',
  path: '',
  status: 'DRAFT',
  generatedByAI: false,
  approved: false,
  projectId: ''
};

export function DocumentationFormModal({
  open,
  loading,
  loadingProjects = false,
  title,
  subtitle,
  documentation,
  projects,
  fixedProjectId,
  onClose,
  onSubmit
}: DocumentationFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DocumentationFormValues>({
    defaultValues
  });

  const projectIdRegistration = register('projectId', {
    required: fixedProjectId === undefined || fixedProjectId === null ? 'Project is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    reset({
      title: documentation?.title ?? '',
      description: documentation?.description ?? '',
      type: documentation?.type ?? '',
      content: documentation?.content ?? '',
      path: documentation?.path ?? '',
      status: documentation?.status ?? 'DRAFT',
      generatedByAI: documentation?.generatedByAI ?? false,
      approved: documentation?.approved ?? false,
      projectId: String(fixedProjectId ?? documentation?.project.id ?? '')
    });
  }, [documentation, fixedProjectId, open, reset]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#09111f] shadow-[0_30px_80px_-40px_rgba(59,130,246,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Documentation management</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button
              className="rounded-2xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-7"
          onSubmit={handleSubmit((values) => {
            const resolvedProjectId = fixedProjectId ?? Number(values.projectId);

            onSubmit({
              title: values.title.trim(),
              description: values.description.trim(),
              type: values.type as DocumentationType,
              content: values.content.trim(),
              path: values.path.trim(),
              status: values.status as DocumentationStatus,
              generatedByAI: values.generatedByAI,
              approved: values.approved,
              projectId: resolvedProjectId
            });
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('title', {
                  required: 'Documentation title is required',
                  maxLength: {
                    value: 150,
                    message: 'Documentation title must be 150 characters or fewer'
                  },
                  validate: (value) => (value.trim() ? true : 'Documentation title is required')
                })}
              />
              {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('description')}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Content</span>
              <textarea
                className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('content')}
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Type</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('type', {
                    required: 'Documentation type is required'
                  })}
                >
                  <option className="bg-slate-950 text-white" value="">
                    Select a type
                  </option>
                  {documentationTypeOptions.map((type) => (
                    <option className="bg-slate-950 text-white" key={type} value={type}>
                      {formatDocumentationType(type)}
                    </option>
                  ))}
                </select>
                {errors.type ? <p className="text-sm text-rose-300">{errors.type.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Status</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('status', {
                    required: 'Documentation status is required'
                  })}
                >
                  {documentationStatusOptions.map((status) => (
                    <option className="bg-slate-950 text-white" key={status} value={status}>
                      {formatDocumentationStatus(status)}
                    </option>
                  ))}
                </select>
                {errors.status ? <p className="text-sm text-rose-300">{errors.status.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Path</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('path', {
                    maxLength: {
                      value: 500,
                      message: 'Path must be 500 characters or fewer'
                    }
                  })}
                />
                {errors.path ? <p className="text-sm text-rose-300">{errors.path.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Project</span>
                {fixedProjectId !== undefined && fixedProjectId !== null ? (
                  <input type="hidden" value={String(fixedProjectId)} {...projectIdRegistration} />
                ) : null}
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loadingProjects || (fixedProjectId !== undefined && fixedProjectId !== null)}
                  {...(fixedProjectId === undefined || fixedProjectId === null ? projectIdRegistration : {})}
                >
                  <option className="bg-slate-950 text-white" value="">
                    {loadingProjects ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projects.map((project) => (
                    <option className="bg-slate-950 text-white" key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                {errors.projectId ? <p className="text-sm text-rose-300">{errors.projectId.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300">
                <input className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-brand-500" type="checkbox" {...register('generatedByAI')} />
                <span>
                  <span className="block font-semibold text-white">Generated externally</span>
                  <span className="mt-1 block text-slate-400">
                    Mark this deliverable as generated outside the normal authoring workflow.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300">
                <input className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-brand-500" type="checkbox" {...register('approved')} />
                <span>
                  <span className="block font-semibold text-white">Approved</span>
                  <span className="mt-1 block text-slate-400">
                    Use this for current manual approval state until the review module is added.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
            <button
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving documentation...
                </>
              ) : documentation ? (
                'Save Documentation'
              ) : (
                'Create Documentation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
