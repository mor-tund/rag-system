import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Layers, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, EmptyState } from "../components/ui-primitives";
import { DocStatusPill, OppStatusPill, SecurityTag } from "../components/status-pill";
import { ErrorState, LoadingState } from "../components/query-states";
import { Td, Th, TableHeadRow } from "../components/table-cell";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import type { WbsItem } from "../data/types";
import { fmtDate, fmtNum, fmtVnd } from "../lib/format";

function KeyFact({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-[13px] text-ink-soft">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

const sum = (items: WbsItem[], k: keyof WbsItem) =>
  items.reduce((n, it) => n + (Number(it[k]) || 0), 0);

export function OpportunityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: opp, loading, error, reload } = useQuery(
    useCallback(() => api.getOpportunity(id!), [id]),
    [id],
  );

  const onDelete = async () => {
    if (!opp || !window.confirm(`Xoá proposal "${opp.name}"? Hành động không hoàn tác được.`)) return;
    await api.deleteOpportunity(opp.id);
    nav("/opportunities");
  };

  if (loading) return <LoadingState />;
  if (error || !opp) {
    return (
      <ErrorState message={error ?? "Không tìm thấy proposal"} onRetry={reload} />
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Proposal", to: "/opportunities" }, { label: `#${opp.id}` }]}
        eyebrow={opp.customer}
        title={opp.name}
        actions={
          <>
            <Link to={`/opportunities/${opp.id}/edit`}>
              <Button variant="secondary">
                <Pencil size={15} /> Sửa
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-rust hover:bg-rust-soft hover:text-rust-ink"
            >
              <Trash2 size={15} /> Xoá
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <OppStatusPill status={opp.status} />
        <span className="font-mono text-xs text-ink-faint">
          {opp.techStack}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {opp.description && (
            <Card className="p-6">
              <h2 className="mb-2 font-display text-lg font-600">Mô tả</h2>
              <p className="text-[15px] leading-relaxed text-ink-soft">{opp.description}</p>
            </Card>
          )}

          {/* WBS */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Layers size={18} className="text-ink-faint" />
              <h2 className="font-display text-lg font-600">Cấu trúc công việc (WBS)</h2>
              <span className="ml-auto font-mono text-xs text-ink-faint">
                {opp.wbs.length} hạng mục
              </span>
            </div>
            {opp.wbs.length === 0 ? (
              <EmptyState
                icon={<Layers size={22} />}
                title="Chưa có WBS"
                hint="Import file estimate để tự sinh danh sách chức năng và effort."
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <TableHeadRow>
                        <Th>Chức năng</Th>
                        <Th className="text-right">Study</Th>
                        <Th className="text-right">FE</Th>
                        <Th className="text-right">BE</Th>
                        <Th className="text-right">UT</Th>
                        <Th className="text-right">Tổng</Th>
                      </TableHeadRow>
                    </thead>
                    <tbody>
                      {opp.wbs.map((it) => (
                        <tr key={it.id} className="border-b border-line last:border-0">
                          <Td>
                            <span className="block font-medium text-ink">{it.name}</span>
                            <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                              {it.category}
                            </span>
                          </Td>
                          <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(it.effortStudy)}</Td>
                          <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(it.effortFe)}</Td>
                          <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(it.effortBe)}</Td>
                          <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(it.effortUt)}</Td>
                          <Td className="text-right font-mono font-semibold tnum text-ink">{fmtNum(it.effortTotal)}</Td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-2/60 font-semibold">
                        <Td className="text-ink">Tổng cộng (MD)</Td>
                        <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(sum(opp.wbs, "effortStudy"))}</Td>
                        <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(sum(opp.wbs, "effortFe"))}</Td>
                        <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(sum(opp.wbs, "effortBe"))}</Td>
                        <Td className="text-right font-mono tnum text-ink-soft">{fmtNum(sum(opp.wbs, "effortUt"))}</Td>
                        <Td className="text-right font-mono tnum text-accent-ink">{fmtNum(sum(opp.wbs, "effortTotal"))}</Td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </div>

        {/* Sidebar facts */}
        <aside className="lg:col-span-1">
          <Card className="p-5">
            <h2 className="mb-2 font-display text-lg font-600">Thông tin chính</h2>
            <dl>
              <KeyFact label="Khách hàng" value={opp.customer} />
              <KeyFact label="Phòng ban" value={opp.department} />
              <KeyFact label="Phụ trách" value={opp.owner} />
              <KeyFact label="Effort" value={`${fmtNum(opp.totalEffortMd)} MD · ${fmtNum(opp.totalEffortMm)} MM`} />
              <KeyFact label="Thời lượng" value={opp.timelineMonths ? `${opp.timelineMonths} tháng` : null} />
              <KeyFact label="Ngân sách" value={fmtVnd(opp.budget)} />
              <KeyFact label="Ngôn ngữ" value={opp.language?.toUpperCase()} />
              <KeyFact label="Ngày nguồn" value={fmtDate(opp.sourceDate)} />
            </dl>
          </Card>
        </aside>
      </div>

      {/* Documents */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <FileText size={18} className="text-ink-faint" />
          <h2 className="font-display text-lg font-600">Tài liệu</h2>
          <Button size="sm" variant="secondary" className="ml-auto">
            <Upload size={14} /> Tải lên
          </Button>
        </div>
        {opp.documents.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="Chưa có tài liệu"
            hint="Tải lên pptx/xlsx/pdf/docx để chạy pipeline parse → chunk → embed."
          />
        ) : (
          <Card className="divide-y divide-line">
            {opp.documents.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <FileText size={16} className="text-ink-faint" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{d.filename}</span>
                  <span className="flex items-center gap-2">
                    <SecurityTag label={d.securityLabel} />
                    {d.nChunks > 0 && (
                      <span className="font-mono text-[11px] text-ink-faint tnum">· {d.nChunks} chunks</span>
                    )}
                    <span className="font-mono text-[11px] text-ink-faint">· {fmtDate(d.uploadedAt)}</span>
                  </span>
                  {d.error && <span className="mt-1 block text-xs text-rust">{d.error}</span>}
                </div>
                <DocStatusPill status={d.status} />
                <div className="flex gap-1">
                  <button
                    aria-label="Xử lý lại"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    aria-label="Xoá tài liệu"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-rust-soft hover:text-rust-ink"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
