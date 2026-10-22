const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export const formatDateTime = (d: Date) => dateTime.format(d);

/** "just now", "12 min ago", "3 h ago", then a short date. */
export function formatRelative(d: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "yesterday";
  return dateOnly.format(d);
}
