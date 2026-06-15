import type { DocStatus, OppStatus } from "../data/types";

// Status → semantic color. Never color-only: each pill carries a dot + label so
// meaning survives for colorblind users and grayscale printing.

const docMap: Record<DocStatus, { label: string; cls: string }> = {
  ready: { label: "Đã nạp", cls: "bg-accent-soft text-accent-ink" },
  processing: { label: "Đang xử lý", cls: "bg-amber-soft text-amber-ink" },
  pending: { label: "Chờ xử lý", cls: "bg-surface-2 text-ink-soft" },
  error: { label: "Lỗi", cls: "bg-rust-soft text-rust-ink" },
};

const oppMap: Record<OppStatus, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-surface-2 text-ink-soft" },
  review: { label: "Đang duyệt", cls: "bg-amber-soft text-amber-ink" },
  won: { label: "Trúng thầu", cls: "bg-accent-soft text-accent-ink" },
  lost: { label: "Không đạt", cls: "bg-rust-soft text-rust-ink" },
};

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// DB statuses can drift beyond the known union (e.g. legacy "running") — fall
// back to a neutral pill that shows the raw value rather than crashing.
const fallback = (s: string) => ({ label: s || "—", cls: "bg-surface-2 text-ink-soft" });

export const DocStatusPill = ({ status }: { status: DocStatus }) => (
  <Pill {...(docMap[status] ?? fallback(status))} />
);
export const OppStatusPill = ({ status }: { status: OppStatus }) => (
  <Pill {...(oppMap[status] ?? fallback(status))} />
);

export function SecurityTag({ label }: { label: string }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
  );
}
