// Reusable UI primitives used across public site and dashboards.
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useEffect } from "react";
import { X, Loader2, Inbox } from "lucide-react";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className = "", children, disabled, ...rest },
  ref,
) {
  const variantCls: Record<Variant, string> = {
    primary: "bg-navy text-white hover:bg-problue",
    accent: "bg-saffron text-white hover:bg-saffron-600",
    outline: "border border-lightgray bg-white text-navy hover:border-navy-300 hover:bg-navy-50",
    ghost: "text-navy hover:bg-navy-50",
    danger: "bg-error text-white hover:bg-red-800",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`btn ${variantCls[variant]} ${size === "sm" ? "btn-sm" : ""} disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...rest }, ref,
) {
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...rest }, ref,
) {
  return <textarea ref={ref} className={`input ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...rest }, ref,
) {
  return (
    <select ref={ref} className={`input ${className}`} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, error, required, children, hint }: {
  label: string; error?: string; required?: boolean; children: ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-error" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "green" | "amber" | "gray" | "navy" | "red"; children: ReactNode }) {
  const map = { green: "badge-green", amber: "badge-amber", gray: "badge-gray", navy: "badge-navy", red: "badge-red" };
  return <span className={map[tone]}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">{label ?? "Loading…"}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-lightgray bg-white px-6 py-12 text-center">
      <Inbox className="mb-3 h-8 w-8 text-navy-300" aria-hidden />
      <h3 className="text-base font-heading font-semibold text-navy">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-dark/60" onClick={onClose} aria-hidden />
      <div className={`relative z-10 w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-white p-5 shadow-lift`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-heading font-bold text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-navy-50" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
  confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink/90">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-xs text-muted">Page {page} of {pageCount}</span>
      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>Next</Button>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "published" ? "green" : status === "draft" ? "amber" : "gray";
  return <Badge tone={tone as any}>{status}</Badge>;
}

export { Checkbox } from "@/components/ui/Checkbox";
