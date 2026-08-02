import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

/* ---------------- Button ---------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";
type BtnSize = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 disabled:pointer-events-none select-none";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700",
  secondary: "bg-white text-gray-700 border border-gray-300 shadow-xs hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-800",
  danger: "bg-loss-600 text-white shadow-xs hover:bg-loss-700",
  "danger-secondary": "bg-white text-loss-700 border border-loss-200 shadow-xs hover:bg-loss-50",
};
const btnSizes: Record<BtnSize, string> = {
  sm: "text-sm px-3 py-2",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-5 py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: { variant?: BtnVariant; size?: BtnSize } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...rest}
    />
  );
}

/* ---------------- Field / Input / Select ---------------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-loss-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100 aria-[invalid=true]:border-loss-500";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${inputCls} appearance-none pr-10 ${className}`} {...rest}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
        <Icon name="chevron-down" size={18} />
      </span>
    </div>
  );
}

/* ---------------- Card ---------------- */

export function Card({
  className = "",
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white shadow-xs ${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */

export function Badge({
  tone = "gray",
  children,
  className = "",
}: {
  tone?: "gray" | "profit" | "loss" | "warn" | "brand";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    profit: "bg-profit-50 text-profit-700 border-profit-200",
    loss: "bg-loss-50 text-loss-700 border-loss-200",
    warn: "bg-warn-50 text-warn-700 border-warn-100",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium tabular ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------------- Modal (desktop-centered) & Drawer (mobile bottom sheet) ---------------- */

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(onClose);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="anim-fade absolute inset-0 bg-gray-950/50" onClick={onClose} />
      <div className="anim-drawer sm:anim-pop relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-1 pt-4 sm:pt-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-8 border-gray-25 bg-gray-100 text-gray-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
