import React from 'react';
import { useNotification, ToastType } from '../../context/NotificationContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
};

const borderClasses: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-white text-zinc-900',
  error: 'border-rose-200 bg-white text-zinc-900',
  info: 'border-sky-200 bg-white text-zinc-900',
  warning: 'border-amber-200 bg-white text-zinc-900',
};

export function ToastContainer() {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg transition-all duration-200 ${
            borderClasses[toast.type]
          }`}
        >
          {icons[toast.type]}
          <p className="text-sm font-medium leading-5 flex-1 break-words">{toast.message}</p>
          <button
            id={`toast-close-${toast.id}`}
            onClick={() => removeToast(toast.id)}
            className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded transition-colors"
            aria-label="Close toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
