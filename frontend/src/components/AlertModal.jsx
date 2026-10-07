import { useEffect, useRef } from "react";

/** A blocking message that needs the user's attention (errors, mostly). */
export default function AlertModal({ isOpen, type = "error", title, message, onClose }) {
  const okButton = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    okButton.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isError = type === "error";

  return (
    <div className="alert-overlay">
      <div className={`alert-dialog ${isError ? "accent-red" : "accent-green"}`} role="alertdialog" aria-modal="true"
        aria-labelledby="alert-title" aria-describedby="alert-message">
        <div className="alert-dialog__icon" aria-hidden="true">{isError ? "❌" : "✅"}</div>
        <h3 id="alert-title" className="alert-dialog__title">{title || (isError ? "Error" : "Success")}</h3>
        <p id="alert-message" className="alert-dialog__message">{message}</p>
        <button ref={okButton} type="button" className="alert-dialog__button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
