import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';

        return (
          <div
            key={t.id}
            id={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start space-x-3 transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              isSuccess 
                ? 'bg-emerald-900/95 text-white border-emerald-700' 
                : isError 
                ? 'bg-rose-900/95 text-white border-rose-700' 
                : 'bg-slate-900/95 text-white border-slate-700'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-semibold">{t.title}</h5>
              {t.message && <p className="text-xs opacity-90 mt-0.5">{t.message}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-white/70 hover:text-white shrink-0 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
