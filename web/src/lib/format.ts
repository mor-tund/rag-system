// Locale-aware formatting (vi-VN) for currency, effort and dates.

export const fmtVnd = (v?: number) =>
  v == null ? "—" : new Intl.NumberFormat("vi-VN").format(v) + " ₫";

export const fmtVndShort = (v?: number) => {
  if (v == null) return "—";
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + " tỷ";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.?0+$/, "") + " tr";
  return new Intl.NumberFormat("vi-VN").format(v);
};

export const fmtNum = (v?: number) =>
  v == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(v);

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
