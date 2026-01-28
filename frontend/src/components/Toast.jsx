import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext({ addToast: () => {} });

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(({ title, description = '', variant = 'default', duration = 3500 }) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    const timer = setTimeout(() => removeToast(id), duration);
    timers.current.set(id, timer);
    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export const ToastViewport = ({ toasts, onClose }) => {
  return (
    <div className="fixed z-[100] bottom-4 right-4 space-y-3 w-[92vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-xl shadow-lg border p-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 ${
            t.variant === 'success' ? 'border-green-200' : t.variant === 'error' ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {t.title && <div className="text-sm font-semibold text-gray-800">{t.title}</div>}
              {t.description && <div className="text-sm text-gray-600 mt-0.5">{t.description}</div>}
            </div>
            <button
              aria-label="Close"
              onClick={() => onClose(t.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};


