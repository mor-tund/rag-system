import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Persisted light/dark toggle. Initial class applied pre-paint in index.html.
export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("rag-theme", dark ? "dark" : "light");
    } catch {
      /* storage may be blocked — non-fatal */
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
