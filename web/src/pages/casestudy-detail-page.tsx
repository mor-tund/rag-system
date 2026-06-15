import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, EmptyState } from "../components/ui-primitives";
import { DocStatusPill, SecurityTag } from "../components/status-pill";
import { ErrorState, LoadingState } from "../components/query-states";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import { fmtDate } from "../lib/format";

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-[13px] text-ink-soft">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

export function CaseStudyDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: cs, loading, error, reload } = useQuery(
    useCallback(() => api.getCaseStudy(id!), [id]),
    [id],
  );

  const onDelete = async () => {
    if (!cs || !window.confirm(`Xoá case study "${cs.title ?? cs.name}"?`)) return;
    await api.deleteCaseStudy(cs.id);
    nav("/casestudies");
  };

  if (loading) return <LoadingState />;
  if (error || !cs) return <ErrorState message={error ?? "Không tìm thấy case study"} onRetry={reload} />;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Case Study", to: "/casestudies" }, { label: `#${cs.id}` }]}
        eyebrow={cs.domain}
        title={cs.title ?? cs.name}
        actions={
          <>
            <Link to={`/casestudies/${cs.id}/edit`}>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {cs.summary && (
            <Card className="p-6">
              <h2 className="mb-2 font-display text-lg font-600">Tóm tắt</h2>
              <p className="text-[15px] leading-relaxed text-ink-soft">{cs.summary}</p>
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={18} className="text-ink-faint" />
              <h2 className="font-display text-lg font-600">Tài liệu</h2>
              <Button size="sm" variant="secondary" className="ml-auto">
                <Upload size={14} /> Tải lên
              </Button>
            </div>
            {cs.documents.length === 0 ? (
              <EmptyState
                icon={<FileText size={22} />}
                title="Chưa có tài liệu"
                hint="Tải lên tài liệu để vector hoá nội dung."
              />
            ) : (
              <Card className="divide-y divide-line">
                {cs.documents.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <FileText size={16} className="text-ink-faint" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{d.filename}</span>
                      <span className="flex items-center gap-2">
                        <SecurityTag label={d.securityLabel} />
                        {d.nChunks > 0 && (
                          <span className="font-mono text-[11px] text-ink-faint tnum">
                            · {d.nChunks} chunks
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-ink-faint">
                          · {fmtDate(d.uploadedAt)}
                        </span>
                      </span>
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
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="mb-2 font-display text-lg font-600">Thông tin</h2>
            <dl>
              <Fact label="Mã" value={cs.name} />
              <Fact label="Khách hàng" value={cs.customer} />
              <Fact label="Lĩnh vực" value={cs.domain} />
              <Fact label="Năm" value={cs.year} />
              <Fact label="Tech stack" value={cs.techStack} />
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
