import { createContext, useContext, useMemo, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  function confirm(options) {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || "Confirmar ação",
        message: options.message || "Deseja continuar?",
        confirmLabel: options.confirmLabel || "Confirmar",
        cancelLabel: options.cancelLabel || "Cancelar",
        tone: options.tone || "neutral",
        resolve,
      });
    });
  }

  function close(result) {
    if (dialog) {
      dialog.resolve(result);
    }
    setDialog(null);
  }

  const value = useMemo(() => ({ confirm }), []);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => close(false)}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title">{dialog.title}</h2>
            <p>{dialog.message}</p>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button className={`primary-button ${dialog.tone === "danger" ? "button-danger" : ""}`} type="button" onClick={() => close(true)}>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider.");
  }

  return context.confirm;
}
