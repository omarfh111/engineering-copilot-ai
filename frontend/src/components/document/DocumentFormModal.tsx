import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, LoaderCircle, X } from 'lucide-react';
import { documentTypeOptions, formatDocumentType } from '../../lib/document';
import type {
  CreateDocumentPayload,
  DocumentProjectSummary,
  DocumentType,
  SourceDocument,
  UpdateDocumentPayload
} from '../../types/document';

interface DocumentFormModalProps {
  open: boolean;
  loading: boolean;
  loadingProjects?: boolean;
  title: string;
  subtitle: string;
  document?: SourceDocument | null;
  projects: DocumentProjectSummary[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateDocumentPayload | UpdateDocumentPayload, file?: File) => void;
}

interface DocumentFormValues {
  title: string;
  description: string;
  type: DocumentType | '';
  path: string;
  source: string;
  projectId: string;
}

function normalizePath(path: string) {
  return path.trim().replace(/\\/g, '/');
}

const defaultValues: DocumentFormValues = {
  title: '',
  description: '',
  type: '',
  path: '',
  source: '',
  projectId: ''
};

export function DocumentFormModal({
  open,
  loading,
  loadingProjects = false,
  title,
  subtitle,
  document,
  projects,
  fixedProjectId,
  onClose,
  onSubmit
}: DocumentFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<DocumentFormValues>({
    defaultValues
  });
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const projectIdRegistration = register('projectId', {
    required: fixedProjectId === undefined || fixedProjectId === null ? 'Project is required' : false
  });

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSelectedFileName(null);
      setSelectedFile(null);
      return;
    }

    reset({
      title: document?.title ?? '',
      description: document?.description ?? '',
      type: document?.type ?? '',
      path: document?.path ?? '',
      source: document?.source ?? '',
      projectId: String(fixedProjectId ?? document?.project.id ?? '')
    });
    setSelectedFileName(null);
    setSelectedFile(null);
  }, [document, fixedProjectId, open, reset]);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setValue('path', '', { shouldDirty: true, shouldValidate: true });
    setValue('source', file.name, { shouldDirty: true, shouldValidate: true });
    setSelectedFileName(file.name);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="animate-slideUp w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#09111f] shadow-[0_30px_80px_-40px_rgba(59,130,246,0.55)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-200">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Document management</p>
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
          className="space-y-6 px-6 py-6 sm:px-7"
          onSubmit={handleSubmit((values) => {
            const resolvedProjectId = fixedProjectId ?? Number(values.projectId);

            onSubmit({
              title: values.title.trim(),
              description: values.description.trim(),
              type: values.type as DocumentType,
              path: values.path.trim(),
              source: values.source.trim(),
              projectId: resolvedProjectId
            }, selectedFile ?? undefined);
          })}
        >
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('title', {
                  required: 'Document title is required',
                  maxLength: {
                    value: 150,
                    message: 'Document title must be 150 characters or fewer'
                  },
                  validate: (value) => (value.trim() ? true : 'Document title is required')
                })}
              />
              {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                {...register('description', {
                  maxLength: {
                    value: 3000,
                    message: 'Description must be 3000 characters or fewer'
                  }
                })}
              />
              {errors.description ? <p className="text-sm text-rose-300">{errors.description.message}</p> : null}
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Type</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('type', {
                    required: 'Document type is required'
                  })}
                >
                  <option className="bg-slate-950 text-white" value="">
                    Select a type
                  </option>
                  {documentTypeOptions.map((type) => (
                    <option className="bg-slate-950 text-white" key={type} value={type}>
                      {formatDocumentType(type)}
                    </option>
                  ))}
                </select>
                {errors.type ? <p className="text-sm text-rose-300">{errors.type.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Source</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  {...register('source', {
                    maxLength: {
                      value: 200,
                      message: 'Source must be 200 characters or fewer'
                    }
                  })}
                />
                {errors.source ? <p className="text-sm text-rose-300">{errors.source.message}</p> : null}
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">File path or URL</span>
                <input
                  accept=".pdf,.docx,.txt,.md,.html,.htm"
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-brand-400/40"
                  onChange={(event) => handleFileSelect(event.target.files?.[0])}
                  type="file"
                />
                {selectedFileName ? <p className="text-xs text-brand-200">Selected: {selectedFileName}</p> : null}
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  placeholder="Select a file for secure upload, or enter a managed reference path"
                  {...register('path', {
                    maxLength: {
                      value: 500,
                      message: 'Path must be 500 characters or fewer'
                    },
                    setValueAs: normalizePath
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
                  disabled={loadingProjects || fixedProjectId !== undefined && fixedProjectId !== null}
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
                  Saving document...
                </>
              ) : document ? (
                'Save Document'
              ) : (
                'Create Document'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
