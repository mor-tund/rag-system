import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookMarked, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, EmptyState, Input } from "../components/ui-primitives";
import { ErrorState, LoadingState } from "../components/query-states";
import { Td, Th, TableHeadRow } from "../components/table-cell";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";

export function CaseStudyListPage() {
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useQuery(api.listCaseStudies);
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (c) =>
          !q ||
          (c.title ?? c.name).toLowerCase().includes(q.toLowerCase()) ||
          (c.customer ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (c.domain ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [q, data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Kho tri thức"
        title="Case Study"
        description="Dự án đã triển khai — nguồn tham chiếu cho hỏi-đáp và so khớp proposal."
        actions={
          <>
            <Link to="/casestudies/import">
              <Button variant="secondary">
                <Upload size={16} /> Import file
              </Button>
            </Link>
            <Link to="/casestudies/new">
              <Button>
                <Plus size={16} /> Tạo mới
              </Button>
            </Link>
          </>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, khách hàng, lĩnh vực…"
          className="pl-9"
          aria-label="Tìm case study"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookMarked size={22} />}
          title="Không có case study phù hợp"
          hint="Thử từ khoá khác."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((c, i) => (
            <Link
              key={c.id}
              to={`/casestudies/${c.id}`}
              className="group animate-rise rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-soft)]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
                  {c.domain}
                </span>
                <span className="font-mono text-xs text-ink-faint tnum">{c.year}</span>
              </div>
              <h2 className="mt-3 font-display text-lg font-600 leading-snug text-ink transition-colors group-hover:text-accent">
                {c.title}
              </h2>
              <p className="mt-1 text-[13px] text-ink-soft">{c.customer}</p>
              {c.summary && (
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                  {c.summary}
                </p>
              )}
              <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-ink-faint">
                {c.techStack}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Compact index table fallback for scanning */}
      <details className="mt-8 group">
        <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-wide text-ink-faint hover:text-ink-soft">
          ▸ Xem dạng bảng
        </summary>
        <Card className="mt-3 overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <TableHeadRow>
                <Th className="w-14">#</Th>
                <Th>Tên</Th>
                <Th className="hidden sm:table-cell">Lĩnh vực</Th>
                <Th className="text-right">Năm</Th>
              </TableHeadRow>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <Td className="font-mono text-ink-faint tnum">{c.id}</Td>
                  <Td>
                    <Link to={`/casestudies/${c.id}`} className="font-medium text-ink hover:text-accent">
                      {c.title}
                    </Link>
                  </Td>
                  <Td className="hidden text-ink-soft sm:table-cell">{c.domain}</Td>
                  <Td className="text-right font-mono tnum text-ink-soft">{c.year}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </details>
    </>
  );
}
