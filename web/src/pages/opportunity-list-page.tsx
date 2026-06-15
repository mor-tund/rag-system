import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, EmptyState, Input } from "../components/ui-primitives";
import { OppStatusPill } from "../components/status-pill";
import { ErrorState, LoadingState } from "../components/query-states";
import { Td, Th, TableHeadRow } from "../components/table-cell";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import type { OppStatus } from "../data/types";
import { fmtNum, fmtVndShort } from "../lib/format";

const FILTERS: { key: OppStatus | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "draft", label: "Nháp" },
  { key: "review", label: "Đang duyệt" },
  { key: "won", label: "Trúng thầu" },
  { key: "lost", label: "Không đạt" },
];

export function OpportunityListPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<OppStatus | "all">("all");
  const { data, loading, error, reload } = useQuery(api.listOpportunities);

  const rows = useMemo(
    () =>
      (data ?? []).filter((o) => {
        const okFilter = filter === "all" || o.status === filter;
        const okQ =
          !q ||
          o.name.toLowerCase().includes(q.toLowerCase()) ||
          (o.customer ?? "").toLowerCase().includes(q.toLowerCase());
        return okFilter && okQ;
      }),
    [q, filter, data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Kho hồ sơ"
        title="Proposal"
        description="Đề xuất & ước lượng dự án — kèm WBS và tài liệu đã vector hoá."
        actions={
          <>
            <Link to="/opportunities/import">
              <Button variant="secondary">
                <Upload size={16} /> Import file
              </Button>
            </Link>
            <Link to="/opportunities/new">
              <Button>
                <Plus size={16} /> Tạo mới
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc khách hàng…"
            className="pl-9"
            aria-label="Tìm proposal"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 ${
                filter === f.key
                  ? "bg-ink text-paper"
                  : "border border-line text-ink-soft hover:bg-surface-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="Không có proposal phù hợp"
          hint="Thử đổi từ khoá hoặc bộ lọc trạng thái."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <TableHeadRow>
                  <Th className="w-14">#</Th>
                  <Th>Tên đề xuất</Th>
                  <Th className="hidden md:table-cell">Khách hàng</Th>
                  <Th className="hidden lg:table-cell text-right">Effort (MD)</Th>
                  <Th className="hidden sm:table-cell text-right">Ngân sách</Th>
                  <Th className="text-right">Trạng thái</Th>
                </TableHeadRow>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.id}
                    className="group border-b border-line last:border-0 transition-colors hover:bg-surface-2"
                  >
                    <Td className="font-mono text-ink-faint tnum">{o.id}</Td>
                    <Td>
                      <Link
                        to={`/opportunities/${o.id}`}
                        className="font-medium text-ink transition-colors group-hover:text-accent"
                      >
                        {o.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-faint md:hidden">
                        {o.customer}
                      </span>
                    </Td>
                    <Td className="hidden text-ink-soft md:table-cell">{o.customer ?? "—"}</Td>
                    <Td className="hidden text-right font-mono tnum text-ink-soft lg:table-cell">
                      {fmtNum(o.totalEffortMd)}
                    </Td>
                    <Td className="hidden text-right font-mono tnum text-ink-soft sm:table-cell">
                      {fmtVndShort(o.budget)}
                    </Td>
                    <Td className="text-right">
                      <OppStatusPill status={o.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
