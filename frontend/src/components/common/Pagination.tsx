import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set<number>([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 0 && page < totalPages)
    .sort((left, right) => left - right);
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Page {currentPage + 1} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {pages.map((page) => (
            <button
              className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
                page === currentPage
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300'
              }`}
              key={page}
              onClick={() => onPageChange(page)}
              type="button"
            >
              {page + 1}
            </button>
          ))}
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
