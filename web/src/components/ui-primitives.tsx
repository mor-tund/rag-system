import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// Shared primitives. Single confident accent, hairline borders, 150–200ms
// transitions, visible focus rings — on-style and accessible by default.

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] text-sm font-semibold " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px cursor-pointer";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-accent text-white hover:brightness-110 shadow-[var(--shadow-soft)]",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "bg-rust text-white hover:brightness-110",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "h-8 px-3" : "h-10 px-4";
  return (
    <button className={`${btnBase} ${btnVariants[variant]} ${pad} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={style}
      className={`rounded-[var(--radius-card)] border border-line bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-rust">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

// 16px+ inputs avoid iOS zoom; warm fill + accent focus ring.
const fieldCls =
  "w-full rounded-[var(--radius-field)] border border-line-strong bg-paper px-3 py-2 text-[15px] " +
  "text-ink placeholder:text-ink-faint transition-colors duration-150 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`${fieldCls} ${p.className ?? ""}`} />
);
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${fieldCls} min-h-24 resize-y ${p.className ?? ""}`} />
);
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${fieldCls} ${p.className ?? ""}`}>
    {children}
  </select>
);

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-faint">
        {icon}
      </div>
      <div>
        <p className="font-display text-lg text-ink">{title}</p>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
