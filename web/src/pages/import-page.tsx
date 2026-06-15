import { type DragEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, FileSpreadsheet, FileUp, Sparkles, X } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card } from "../components/ui-primitives";
import { api } from "../lib/api";

interface ImportConfig {
  kind: "opportunity" | "case_study";
}

const COPY = {
  opportunity: {
    title: "Import proposal",
    crumb: "Proposal",
    backTo: "/opportunities",
    accept: ".xlsx,.xls",
    hint: "Tải lên file estimate (.xlsx) — hệ thống tự điền thông tin & sinh WBS.",
    steps: ["Đọc sheet estimate", "Trích header + WBS", "Embed vào vector store"],
  },
  case_study: {
    title: "Import case study",
    crumb: "Case Study",
    backTo: "/casestudies",
    accept: ".pdf,.docx,.pptx,.txt,.md",
    hint: "Tải lên tài liệu (pdf/docx/pptx) — trích metadata & vector hoá nội dung.",
    steps: ["Parse tài liệu", "Trích lĩnh vực + tech", "Embed vào vector store"],
  },
} as const;

export function ImportPage({ kind }: ImportConfig) {
  const c = COPY[kind];
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const doImport = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved =
        kind === "opportunity"
          ? await api.importOpportunity(file)
          : await api.importCaseStudy(file);
      nav(`${c.backTo}/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import thất bại");
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: c.crumb, to: c.backTo }, { label: "Import" }]}
        eyebrow="Nạp dữ liệu"
        title={c.title}
        description={c.hint}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-16 text-center transition-colors duration-150 ${
              over ? "border-accent bg-accent-soft/50" : "border-line-strong bg-surface hover:bg-surface-2"
            }`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
              <FileUp size={24} />
            </span>
            <span>
              <span className="block font-display text-lg font-600 text-ink">
                Kéo thả file vào đây
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                hoặc bấm để chọn · {c.accept}
              </span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={c.accept}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </button>

          {file && (
            <Card className="mt-4 flex items-center gap-3 p-4 animate-rise">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                <FileSpreadsheet size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{file.name}</span>
                <span className="font-mono text-xs text-ink-faint tnum">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={() => setFile(null)}
                aria-label="Bỏ chọn file"
                className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
              >
                <X size={16} />
              </button>
            </Card>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-2 rounded-[var(--radius-field)] bg-rust-soft px-3 py-2 text-sm text-rust-ink" role="alert">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Button disabled={!file || busy} onClick={doImport}>
              {busy ? "Đang xử lý…" : "Import & vector hoá"} <ArrowRight size={16} />
            </Button>
            <Link to={c.backTo}>
              <Button variant="ghost" type="button">
                Huỷ
              </Button>
            </Link>
          </div>
        </div>

        {/* Pipeline explainer */}
        <Card className="h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-accent">
            <Sparkles size={16} />
            <h2 className="font-display text-base font-600 text-ink">Pipeline xử lý</h2>
          </div>
          <ol className="space-y-3">
            {c.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs font-semibold text-ink-soft tnum">
                  {i + 1}
                </span>
                <span className="text-sm text-ink-soft">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-ink-faint">
            Embedding chạy cục bộ bằng bge-m3. Không gửi tài liệu ra ngoài.
          </p>
        </Card>
      </div>
    </>
  );
}
