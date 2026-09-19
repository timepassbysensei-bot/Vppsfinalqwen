export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function maskName(name: string): string {
  // Privacy: show first name + last initial when consent is not recorded
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function waLink(number: string | null | undefined, text?: string): string {
  const digits = (number ?? "").replace(/\D/g, "");
  const base = digits.length > 10 ? digits : `91${digits}`;
  return `https://wa.me/${base}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(number: string | null | undefined): string {
  return `tel:${(number ?? "").replace(/[^\d+]/g, "")}`;
}

export function slugify(s: string): string {
  // Every run of non-alphanumeric characters becomes a single hyphen, so titles
  // such as "CDS/NDA_Target" turn into "cds-nda-target" instead of "cdsndatarget".
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readableStudentCode(prefix = "BDA", year?: number): string {
  const y = year ?? new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}-${String(rand).padStart(4, "0")}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function bytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function pct(part: number | null | undefined, whole: number | null | undefined): string {
  if (!whole || part === null || part === undefined) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

// CSV helpers are defined next to the marks maths (and unit-tested there) but are
// shared by every admin export/import screen, so they are re-exported here too.
export { toCsv, csvEscape, downloadText } from "@/lib/marks";
