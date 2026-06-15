import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// Editorial page masthead — serif title, optional breadcrumb + eyebrow, actions
// pushed right. Asymmetric on purpose (title left, actions right, no centering).

export interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 animate-rise">
      {crumbs && crumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-faint">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {c.to ? (
                <Link to={c.to} className="transition-colors hover:text-accent">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-soft">{c.label}</span>
              )}
              {i < crumbs.length - 1 && <span className="text-line-strong">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[28px] font-600 leading-tight tracking-tight text-ink sm:text-[34px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
