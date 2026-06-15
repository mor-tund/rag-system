import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui-primitives";

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function LoadingState({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-20 text-ink-soft">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-rust-soft bg-rust-soft/40 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-rust-soft text-rust-ink">
        <AlertTriangle size={22} />
      </span>
      <div>
        <p className="font-display text-lg text-ink">Không tải được dữ liệu</p>
        <p className="mt-1 text-sm text-ink-soft">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
