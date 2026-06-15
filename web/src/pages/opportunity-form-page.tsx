import { type FormEvent, type ReactNode, useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, Field, Input, Select, Textarea } from "../components/ui-primitives";
import { ErrorState, LoadingState } from "../components/query-states";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import type { Opportunity } from "../data/types";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="mb-5 font-display text-lg font-600">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function OpportunityFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const existing = useQuery(
    useCallback(() => (editing ? api.getOpportunity(id!) : Promise.resolve(null)), [id, editing]),
    [id],
  );
  const opp = existing.data;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    const v = (k: string) => (f.elements.namedItem(k) as HTMLInputElement | null)?.value.trim() ?? "";
    const n = (k: string) => (v(k) === "" ? undefined : Number(v(k)));
    const body: Partial<Opportunity> = {
      name: v("name"), customer: v("customer"), department: v("department"),
      techStack: v("tech"), owner: v("owner"), status: v("status") as Opportunity["status"],
      totalEffortMm: n("mm"), totalEffortMd: n("md"), timelineMonths: n("timeline"),
      budget: n("budget"), language: v("language"), sourceDate: v("source-date") || undefined,
      description: v("description"),
    };
    setSaving(true);
    setErr(null);
    try {
      const saved = editing
        ? await api.updateOpportunity(id!, body)
        : await api.createOpportunity(body);
      nav(`/opportunities/${saved.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Lưu thất bại");
      setSaving(false);
    }
  };

  if (editing && existing.loading) return <LoadingState />;
  if (editing && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;

  return (
    <form onSubmit={submit}>
      <PageHeader
        crumbs={[
          { label: "Proposal", to: "/opportunities" },
          { label: editing ? `#${id}` : "Tạo mới" },
        ]}
        eyebrow={editing ? "Chỉnh sửa" : "Hồ sơ mới"}
        title={editing ? (opp?.name ?? "Sửa proposal") : "Tạo proposal"}
        actions={
          <>
            <Link to={editing ? `/opportunities/${id}` : "/opportunities"}>
              <Button variant="ghost" type="button">
                <X size={15} /> Huỷ
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              <Check size={16} /> {saving ? "Đang lưu…" : "Lưu"}
            </Button>
          </>
        }
      />

      {err && (
        <p className="mb-5 flex items-center gap-2 rounded-[var(--radius-field)] bg-rust-soft px-3 py-2 text-sm text-rust-ink" role="alert">
          <AlertTriangle size={15} /> {err}
        </p>
      )}

      <div className="space-y-6">
        <FormSection title="Thông tin chung">
          <div className="sm:col-span-2">
            <Field label="Tên đề xuất" required htmlFor="name">
              <Input id="name" name="name" required defaultValue={opp?.name} placeholder="VD: Hệ thống Quản lý Nhân sự" />
            </Field>
          </div>
          <Field label="Khách hàng" htmlFor="customer">
            <Input id="customer" name="customer" defaultValue={opp?.customer ?? ""} />
          </Field>
          <Field label="Phòng ban" htmlFor="department">
            <Input id="department" name="department" defaultValue={opp?.department ?? ""} />
          </Field>
          <Field label="Phụ trách" htmlFor="owner">
            <Input id="owner" name="owner" defaultValue={opp?.owner ?? ""} />
          </Field>
          <Field label="Trạng thái" htmlFor="status">
            <Select id="status" name="status" defaultValue={opp?.status ?? "draft"}>
              <option value="draft">Nháp</option>
              <option value="review">Đang duyệt</option>
              <option value="won">Trúng thầu</option>
              <option value="lost">Không đạt</option>
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Ước lượng & kỹ thuật">
          <Field label="Effort (man-month)" htmlFor="mm">
            <Input id="mm" name="mm" type="number" step="0.1" defaultValue={opp?.totalEffortMm ?? ""} className="font-mono" />
          </Field>
          <Field label="Effort (man-day)" htmlFor="md">
            <Input id="md" name="md" type="number" step="0.5" defaultValue={opp?.totalEffortMd ?? ""} className="font-mono" />
          </Field>
          <Field label="Thời lượng (tháng)" htmlFor="timeline">
            <Input id="timeline" name="timeline" type="number" step="0.5" defaultValue={opp?.timelineMonths ?? ""} className="font-mono" />
          </Field>
          <Field label="Ngân sách (₫)" htmlFor="budget" hint="Nhập số nguyên, không cần dấu phân cách.">
            <Input id="budget" name="budget" type="number" defaultValue={opp?.budget ?? ""} className="font-mono" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tech stack" htmlFor="tech">
              <Input id="tech" name="tech" defaultValue={opp?.techStack ?? ""} placeholder="React, NestJS, PostgreSQL…" />
            </Field>
          </div>
          <Field label="Ngôn ngữ" htmlFor="language">
            <Select id="language" name="language" defaultValue={opp?.language ?? "vi"}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="Ngày nguồn" htmlFor="source-date">
            <Input id="source-date" name="source-date" type="date" defaultValue={opp?.sourceDate ?? ""} className="font-mono" />
          </Field>
        </FormSection>

        <FormSection title="Mô tả">
          <div className="sm:col-span-2">
            <Field label="Tóm tắt đề xuất" htmlFor="description">
              <Textarea id="description" name="description" defaultValue={opp?.description ?? ""} className="min-h-32" />
            </Field>
          </div>
        </FormSection>
      </div>
    </form>
  );
}
