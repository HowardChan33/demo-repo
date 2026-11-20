/** Parse hh:mm:ss(.ms) or mm:ss into seconds. Returns null if empty/invalid. */
export function parseTimeToSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.trim().split("(")[0].trim();
  if (!cleaned || /^(dnf|dq|dns|qry|uof|started|not started|-)$/i.test(cleaned)) {
    return null;
  }
  const parts = cleaned.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

export function formatSeconds(total: number | null): string {
  if (total === null || Number.isNaN(total)) return "—";
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

export function formatGap(a: string | null, b: string | null): string {
  const sa = parseTimeToSeconds(a);
  const sb = parseTimeToSeconds(b);
  if (sa === null || sb === null) return "—";
  const diff = sa - sb;
  if (diff === 0) return "even";
  return diff > 0 ? `+${formatSeconds(diff)}` : formatSeconds(diff);
}
