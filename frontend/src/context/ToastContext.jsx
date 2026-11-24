import { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastContext } from './useContexts';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 3600);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="no-print fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 pointer-events-none sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[#E6E0D4] bg-white px-4 py-3 shadow-md transition-all dark:border-[#252C3F] dark:bg-[#161B26] dark:shadow-xl dark:shadow-black/40"
            >
              <span className="mt-0.5 shrink-0">
                {isError ? (
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                ) : isInfo ? (
                  <Info className="h-4 w-4 text-[#624CE0] dark:text-[#93C5FD]" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[#3F8F56] dark:text-[#86EFAC]" />
                )}
              </span>
              <p className="flex-1 text-[13px] font-medium leading-snug text-[#141518] dark:text-[#F1F5F9]">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-full p-1 text-[#71717A] hover:bg-[#FAF7F0] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:bg-[#232A3C] dark:hover:text-white"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
