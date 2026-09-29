import { createContext, useCallback, useContext, useRef, useState } from "react";

// Non-blocking confirmations ("Offer published", "Profile saved"...).
// Errors that need the user's attention still use AlertModal.
const ToastContext = createContext(() => {});

const DURATION_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback((message, type = "success") => {
    const id = ++nextId.current;
    setToasts((all) => [...all, { id, message, type }]);
    setTimeout(() => dismiss(id), DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
