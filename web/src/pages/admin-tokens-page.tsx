import { type FormEvent, useState } from "react";
import { Check, Copy, KeyRound, Plus, Power, Trash2 } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { Button, Card, EmptyState, Input } from "../components/ui-primitives";
import { ErrorState, LoadingState } from "../components/query-states";
import { Td, Th, TableHeadRow } from "../components/table-cell";
import { api } from "../lib/api";
import { useQuery } from "../lib/use-query";
import type { McpToken } from "../data/types";
import { fmtDate, fmtNum } from "../lib/format";

export function AdminTokensPage() {
  const { data, loading, error, reload } = useQuery(api.listTokens);
  const tokens = data ?? [];
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await api.createToken(name.trim());
      setName("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t: McpToken) => {
    await api.toggleToken(t.id, !t.active);
    reload();
  };
  const remove = async (t: McpToken) => {
    if (!window.confirm(`Xoá token của "${t.userName}"?`)) return;
    await api.deleteToken(t.id);
    reload();
  };
  const copy = (t: McpToken) => {
    navigator.clipboard?.writeText(t.token).catch(() => undefined);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quản trị"
        title="Token MCP theo user"
        description="Cấp & thu hồi token cho phép Claude của từng user truy cập kho tri thức qua MCP."
      />

      <form onSubmit={create} className="mb-6">
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <KeyRound size={18} className="shrink-0 text-ink-faint" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên user (VD: thuongnd)"
              aria-label="Tên user"
              className="font-mono"
            />
          </div>
          <Button type="submit" disabled={!name.trim() || busy}>
            <Plus size={16} /> {busy ? "Đang cấp…" : "Cấp token"}
          </Button>
        </Card>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : tokens.length === 0 ? (
        <EmptyState icon={<KeyRound size={22} />} title="Chưa có token" hint="Cấp token đầu tiên ở trên." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <TableHeadRow>
                  <Th>User</Th>
                  <Th>Token</Th>
                  <Th className="hidden md:table-cell text-right">Lượt gọi</Th>
                  <Th className="hidden sm:table-cell text-right">Dùng gần nhất</Th>
                  <Th className="text-right">Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </TableHeadRow>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <Td className="font-medium text-ink">{t.userName}</Td>
                    <Td>
                      <button
                        onClick={() => copy(t)}
                        className="group inline-flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1 font-mono text-[12px] text-ink-soft transition-colors hover:text-ink"
                        title="Sao chép token"
                      >
                        {t.token}
                        {copied === t.id ? (
                          <Check size={13} className="text-accent" />
                        ) : (
                          <Copy size={13} className="opacity-50 group-hover:opacity-100" />
                        )}
                      </button>
                    </Td>
                    <Td className="hidden text-right font-mono tnum text-ink-soft md:table-cell">
                      {fmtNum(t.calls)}
                    </Td>
                    <Td className="hidden text-right font-mono text-ink-faint sm:table-cell">
                      {fmtDate(t.lastUsed)}
                    </Td>
                    <Td className="text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          t.active ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-faint"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {t.active ? "Hoạt động" : "Đã thu hồi"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => toggle(t)}
                          aria-label={t.active ? "Thu hồi" : "Kích hoạt"}
                          title={t.active ? "Thu hồi" : "Kích hoạt"}
                          className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-amber-soft hover:text-amber-ink"
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => remove(t)}
                          aria-label="Xoá token"
                          title="Xoá"
                          className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-rust-soft hover:text-rust-ink"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-5 font-mono text-[11px] leading-relaxed text-ink-faint">
        Endpoint MCP: <span className="text-ink-soft">http://&lt;server&gt;:8211/mcp</span> · xác thực bằng
        Bearer token ở trên.
      </p>
    </>
  );
}
