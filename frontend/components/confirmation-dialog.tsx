"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect } from "react";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  error,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  error?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open || pending) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, open, pending]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <h2
              id="confirmation-dialog-title"
              className="text-sm font-semibold text-ink"
            >
              {title}
            </h2>
            <p
              id="confirmation-dialog-description"
              className="mt-1 text-xs leading-5 text-muted"
            >
              {description}
            </p>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <LoaderCircle size={13} className="animate-spin" />}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
