import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import {
  BookMarked,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  MessagesSquare,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  match?: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/opportunities", label: "Proposal", icon: FolderKanban },
  { to: "/casestudies", label: "Case Study", icon: BookMarked },
  { to: "/ask", label: "Hỏi-đáp AI", icon: MessagesSquare },
  { to: "/admin/tokens", label: "Token MCP", icon: KeyRound },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-display text-lg font-700 text-white">
        R
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-600 tracking-tight text-ink">RAG CMS</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          tri thức · proposal
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon
              size={18}
              className={active ? "text-accent" : "text-ink-faint group-hover:text-ink-soft"}
            />
            {label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const logout = async () => {
    onNavigate?.();
    try {
      await api.logout();
    } finally {
      nav("/login");
    }
  };
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Brand />
      <p className="px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Điều hướng
      </p>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto border-t border-line pt-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-[var(--radius-field)] px-3 py-2.5 text-left text-[14px] font-medium text-ink-soft transition-colors hover:bg-rust-soft hover:text-rust-ink"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
        <p className="mt-3 px-3 font-mono text-[10px] text-ink-faint">
          bge-m3 · pgvector · claude
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 animate-rise border-r border-line bg-surface shadow-[var(--shadow-pop)]">
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
              className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
            >
              <X size={18} />
            </button>
            <SidebarInner onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:bg-surface-2"
        >
          <Menu size={18} />
        </button>
        <Brand />
        <ThemeToggle />
      </div>

      <main className="lg:pl-64">
        {/* Desktop floating theme toggle */}
        <div className="pointer-events-none sticky top-0 z-10 hidden justify-end px-8 pt-5 lg:flex">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-7 lg:-mt-9 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
