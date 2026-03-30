import { useEffect } from "react";

export type ToastType = "success" | "error";

export type ToastMessage = {
  id: number;
  type: ToastType;
  text: string;
};

type ToastProps = {
  toast: ToastMessage;
  durationMs?: number;
  onClose: (id: number) => void;
};

export function Toast({ toast, durationMs = 3500, onClose }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onClose(toast.id), durationMs);
    return () => window.clearTimeout(timeout);
  }, [toast.id, durationMs, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg " +
        (toast.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span>{toast.text}</span>
        <button
          onClick={() => onClose(toast.id)}
          className="rounded-md border border-current px-2 py-1 text-xs"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
