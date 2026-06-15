import { type FormEvent, type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUp, BookMarked, FolderKanban, Quote, Sparkles } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, Textarea } from "../components/ui-primitives";
import { api, ApiError, type AskResponse } from "../lib/api";
import { useNavigate } from "react-router-dom";

const EXAMPLES = [
  "Case study nào giống proposal HCMS nhất?",
  "HCMS tổng effort bao nhiêu man-day?",
  "Những dự án nào dùng PostgreSQL?",
];

// Minimal **bold** renderer — answers use light markdown only.
function renderAnswer(text: string): ReactNode {
  return text.split("\n\n").map((para, i) => (
    <p key={i} className="mb-3 last:mb-0 leading-relaxed text-ink">
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
        seg.startsWith("**") ? (
          <strong key={j} className="font-600 text-ink">
            {seg.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{seg}</span>
        ),
      )}
    </p>
  ));
}

export function AskPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!q.trim() || state === "loading") return;
    setState("loading");
    setError(null);
    try {
      const res = await api.ask(q.trim());
      setResult(res);
      setState("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        nav("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Hỏi thất bại");
      setState("idle");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Hỏi-đáp RAG"
        title="Hỏi về kho tri thức"
        description="Câu trả lời tổng hợp từ proposal & case study, kèm nguồn truy xuất có độ tương đồng."
      />

      <form onSubmit={ask}>
        <Card className="p-2 shadow-[var(--shadow-soft)] transition-shadow focus-within:shadow-[var(--shadow-pop)]">
          <Textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
            }}
            placeholder="VD: Case study nào giống opp HCMS? HCMS tổng effort bao nhiêu?"
            className="min-h-20 border-0 bg-transparent text-[16px] focus:ring-0"
            aria-label="Câu hỏi"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="font-mono text-[11px] text-ink-faint">
              ⌘↵ để gửi · tổng hợp bằng claude (~10–30s)
            </span>
            <Button type="submit" size="sm" disabled={!q.trim() || state === "loading"}>
              {state === "loading" ? "Đang hỏi…" : "Hỏi"}
              {state !== "loading" && <ArrowUp size={15} />}
            </Button>
          </div>
        </Card>
      </form>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-[var(--radius-field)] bg-rust-soft px-3 py-2 text-sm text-rust-ink" role="alert">
          <AlertTriangle size={15} /> {error}
        </p>
      )}

      {/* Example chips */}
      {state === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQ(ex);
              }}
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {state === "loading" && (
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Đang truy xuất & tổng hợp…</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {[100, 92, 96, 70].map((w, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded bg-surface-2"
                style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Answer + sources */}
      {state === "done" && result && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="animate-rise p-6 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
              <Quote size={16} className="text-accent" />
              <h2 className="font-display text-lg font-600">Trả lời</h2>
            </div>
            <div className="text-[15px]">{renderAnswer(result.answer)}</div>
          </Card>

          <aside className="animate-rise" style={{ animationDelay: "100ms" }}>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-faint">
              Nguồn truy xuất · top {result.sources.length}
            </h3>
            <div className="space-y-2.5">
              {result.sources.length === 0 && (
                <p className="text-sm text-ink-faint">Không có nguồn nào khớp.</p>
              )}
              {result.sources.map((s, i) => (
                <Card key={i} className="p-3.5">
                  <div className="flex items-center gap-2">
                    {s.type === "case_study" ? (
                      <BookMarked size={14} className="text-accent" />
                    ) : (
                      <FolderKanban size={14} className="text-amber" />
                    )}
                    <span className="truncate text-[13px] font-medium text-ink">{s.src}</span>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-ink-faint">{s.loc}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${s.sim * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-ink-soft tnum">
                      {s.sim.toFixed(2)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </aside>
        </div>
      )}

      {state === "idle" && (
        <p className="mt-10 text-center text-sm text-ink-faint">
          Hoặc cấp <Link to="/admin/tokens" className="text-accent hover:underline">token MCP</Link>{" "}
          để hỏi trực tiếp từ Claude của bạn.
        </p>
      )}
    </>
  );
}
