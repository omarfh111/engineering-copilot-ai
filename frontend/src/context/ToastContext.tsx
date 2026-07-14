import { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function toastStyles(type: ToastType) {
  if (type === 'success') {
    return {
      icon: CheckCircle2,
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-100'
    };
  }

  if (type === 'error') {
    return {
      icon: TriangleAlert,
      className:
        'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/80 dark:text-rose-100'
    };
  }

  return {
    icon: Info,
    className:
      'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/80 dark:text-brand-100'
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();

    setToasts((currentToasts) => [...currentToasts, { ...toast, id }]);

    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const styles = toastStyles(toast.type);
          const Icon = styles.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-slideUp rounded-2xl border px-4 py-3 shadow-panel ${styles.className}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
                </div>
                <button
                  className="rounded-full p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => removeToast(toast.id)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
