import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Lock, Quote, User } from "lucide-react";
import { Button, Field, Input } from "../components/ui-primitives";
import { ThemeToggle } from "../components/theme-toggle";
import { api } from "../lib/api";

// Split-screen: editorial manifesto panel (left) + focused auth (right).
// Authenticates against the FastAPI session-cookie login.
export function LoginPage() {
  const nav = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    setPending(true);
    setError(null);
    try {
      await api.login(username, password);
      nav("/");
    } catch {
      setError("Sai tài khoản hoặc mật khẩu");
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Manifesto panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-accent p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 font-display text-lg font-700">
            R
          </span>
          <span className="font-display text-lg font-600">RAG CMS</span>
        </div>
        <div className="relative max-w-md">
          <Quote size={34} className="mb-5 text-white/40" />
          <p className="font-display text-[28px] font-500 leading-snug">
            Mọi proposal, mọi case study — trả lời có trích nguồn, ngay tại chỗ.
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Tài liệu được vector hoá cục bộ bằng bge-m3. Chỉ khâu tổng hợp câu trả
            lời mới gọi đến Claude.
          </p>
        </div>
        <div className="relative flex gap-8 font-mono text-sm text-white/70">
          <div>
            <div className="text-2xl font-600 text-white tnum">743</div>vector chunks
          </div>
          <div>
            <div className="text-2xl font-600 text-white tnum">9</div>hồ sơ tri thức
          </div>
          <div>
            <div className="text-2xl font-600 text-white tnum">100%</div>nội bộ
          </div>
        </div>
      </section>

      {/* Auth panel */}
      <section className="relative flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-sm animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Quản trị viên</p>
          <h1 className="mt-2 font-display text-3xl font-600 tracking-tight">Đăng nhập</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Truy cập khu vực quản trị nội dung & token MCP.
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            <Field label="Tài khoản" htmlFor="username" required>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <Input id="username" defaultValue="admin" autoComplete="username" className="pl-9" />
              </div>
            </Field>
            <Field label="Mật khẩu" htmlFor="password" required>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue="1234"
                  autoComplete="current-password"
                  className="pl-9"
                />
              </div>
            </Field>
            {error && (
              <p className="flex items-center gap-2 rounded-[var(--radius-field)] bg-rust-soft px-3 py-2 text-sm text-rust-ink" role="alert">
                <AlertTriangle size={15} /> {error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? "Đang vào…" : "Vào hệ thống"}
              {!pending && <ArrowRight size={16} />}
            </Button>
          </form>
          <p className="mt-6 font-mono text-xs text-ink-faint">
            Phiên đăng nhập dùng cookie · /api/auth
          </p>
        </div>
      </section>
    </div>
  );
}
