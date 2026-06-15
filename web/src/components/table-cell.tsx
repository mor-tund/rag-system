import type { ReactNode } from "react";

// Shared table header/body cells — mono uppercase headers, consistent padding.
export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

export function TableHeadRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-line bg-surface-2/60 text-left">{children}</tr>;
}
