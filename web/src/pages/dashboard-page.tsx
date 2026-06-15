import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookMarked,
  Database,
  FileStack,
  FolderKanban,
  Plus,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Card } from "../components/ui-primitives";
import { OppStatusPill } from "../components/status-pill";
import { ErrorState, LoadingState } from "../components/query-states";
import { api, type Stats } from "../lib/api";
import { useQuery } from "../lib/use-query";
import { fmtVndShort } from "../lib/format";

function SparkBars({ trend }: { trend: Stats["ingestTrend"] }) {
  const max = Math.max(1, ...trend.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height: 64 }}>
      {trend.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className="w-full rounded-t-sm bg-accent/80 transition-all hover:bg-accent"
            style={{ height: `${Math.max(2, (d.value / max) * 56)}px` }}
            title={`${d.label}: ${d.value} chunks`}
          />
          <span className="font-mono text-[10px] text-ink-faint">{d.label}</span>
        </div>
      ))}
      <span className="sr-only">Số chunk nạp theo 6 tháng gần nhất</span>
    </div>
  );
}

const tileMeta = [
  { key: "opportunity", label: "Proposal", icon: FolderKanban, to: "/opportunities" },
  { key: "case_study", label: "Case study", icon: BookMarked, to: "/casestudies" },
  { key: "document", label: "Tài liệu", icon: FileStack, to: "/opportunities" },
] as const;

export function DashboardPage() {
  const stats = useQuery(api.stats);
  const opps = useQuery(api.listOpportunities);
  const css = useQuery(api.listCaseStudies);

  const loading = stats.loading || opps.loading || css.loading;
  const error = stats.error || opps.error || css.error;

  return (
    <>
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Tổng quan tri thức"
        description="Kho proposal & case study đã vector hoá, sẵn sàng cho hỏi-đáp có trích nguồn."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { stats.reload(); opps.reload(); css.reload(); }} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tileMeta.map(({ key, label, icon: Icon, to }, i) => (
              <Link
                key={key}
                to={to}
                className="group animate-rise rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <Icon size={18} className="text-ink-faint" />
                  <ArrowUpRight
                    size={15}
                    className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <div className="mt-4 font-mono text-3xl font-600 tnum text-ink">
                  {stats.data!.counts[key]}
                </div>
                <div className="mt-0.5 text-[13px] text-ink-soft">{label}</div>
              </Link>
            ))}

            <Card className="col-span-2 animate-rise p-5" style={{ animationDelay: "180ms" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-ink-faint">
                    <Database size={18} />
                    <span className="text-[13px]">Vector chunks</span>
                  </div>
                  <div className="mt-3 font-mono text-3xl font-600 tnum text-ink">
                    {stats.data!.counts.document_chunk}
                  </div>
                </div>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-accent-ink">
                  bge-m3
                </span>
              </div>
              <div className="mt-4">
                <SparkBars trend={stats.data!.ingestTrend} />
              </div>
            </Card>
          </div>

          <div className="mt-4 flex flex-col items-start gap-4 overflow-hidden rounded-[var(--radius-card)] bg-accent p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
                <Sparkles size={20} />
              </span>
              <div>
                <h2 className="font-display text-xl font-600">Hỏi-đáp có trích nguồn</h2>
                <p className="mt-1 max-w-md text-sm text-white/75">
                  Đặt câu hỏi về proposal hay case study — câu trả lời kèm nguồn truy xuất.
                </p>
              </div>
            </div>
            <Link
              to="/ask"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-field)] bg-white px-4 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02]"
            >
              Mở hỏi-đáp <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-600">Proposal gần đây</h2>
                <Link to="/opportunities/new" className="text-sm font-semibold text-accent hover:underline">
                  <span className="inline-flex items-center gap-1">
                    <Plus size={14} /> Tạo mới
                  </span>
                </Link>
              </div>
              <Card className="divide-y divide-line">
                {opps.data!.slice(0, 5).map((o) => (
                  <Link
                    key={o.id}
                    to={`/opportunities/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="font-mono text-xs text-ink-faint tnum">#{o.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{o.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{o.customer}</span>
                    </span>
                    <span className="hidden font-mono text-xs text-ink-soft tnum sm:block">
                      {fmtVndShort(o.budget)}
                    </span>
                    <OppStatusPill status={o.status} />
                  </Link>
                ))}
                {opps.data!.length === 0 && (
                  <p className="px-4 py-6 text-sm text-ink-faint">Chưa có proposal nào.</p>
                )}
              </Card>
            </section>

            <section className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-600">Case study gần đây</h2>
                <Link to="/casestudies" className="text-sm font-semibold text-accent hover:underline">
                  Tất cả
                </Link>
              </div>
              <Card className="divide-y divide-line">
                {css.data!.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    to={`/casestudies/${c.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="block truncate font-medium text-ink">{c.title ?? c.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
                        {c.domain ?? "—"}
                      </span>
                      <span className="tnum">{c.year}</span>
                    </span>
                  </Link>
                ))}
                {css.data!.length === 0 && (
                  <p className="px-4 py-6 text-sm text-ink-faint">Chưa có case study nào.</p>
                )}
              </Card>
            </section>
          </div>
        </>
      )}
    </>
  );
}
