import { type FormEvent, useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, Field, Input } from "../components/ui-primitives";
import { ErrorState, LoadingState } from "../components/query-states";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import type { CaseStudy } from "../data/types";

export function CaseStudyFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const existing = useQuery(
    useCallback(() => (editing ? api.getCaseStudy(id!) : Promise.resolve(null)), [id, editing]),
    [id],
  );
  const cs = existing.data;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    const v = (k: string) => (f.elements.namedItem(k) as HTMLInputElement | null)?.value.trim() ?? "";
    const body: Partial<CaseStudy> = {
      name: v("name"), title: v("title"), customer: v("customer"),
      domain: v("domain"), techStack: v("tech"),
    };
    setSaving(true);
    setErr(null);
    try {
      const saved = editing
        ? await api.updateCaseStudy(id!, body)
        : await api.createCaseStudy(body);
      nav(`/casestudies/${saved.id}`);
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
          { label: "Case Study", to: "/casestudies" },
          { label: editing ? `#${id}` : "Tạo mới" },
        ]}
        eyebrow={editing ? "Chỉnh sửa" : "Hồ sơ mới"}
        title={editing ? (cs?.title ?? "Sửa case study") : "Tạo case study"}
        actions={
          <>
            <Link to={editing ? `/casestudies/${id}` : "/casestudies"}>
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

      <Card className="max-w-2xl p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Mã case study" required htmlFor="name" hint="Định danh ngắn, VD: CS-EVNHCM">
              <Input id="name" name="name" required defaultValue={cs?.name} className="font-mono" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Tiêu đề" htmlFor="title">
              <Input id="title" name="title" defaultValue={cs?.title ?? ""} placeholder="VD: Số hoá nhân sự ngành điện" />
            </Field>
          </div>
          <Field label="Khách hàng" htmlFor="customer">
            <Input id="customer" name="customer" defaultValue={cs?.customer ?? ""} />
          </Field>
          <Field label="Lĩnh vực" htmlFor="domain">
            <Input id="domain" name="domain" defaultValue={cs?.domain ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tech stack" htmlFor="tech">
              <Input id="tech" name="tech" defaultValue={cs?.techStack ?? ""} placeholder="React, Django, PostgreSQL…" />
            </Field>
          </div>
        </div>
      </Card>
    </form>
  );
}
