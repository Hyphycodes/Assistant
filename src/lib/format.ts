export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(value));
}

export function formatDateRange(start: string, end?: string, precision?: string) {
  if (precision === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(start));
  }
  if (!end) return formatDate(start, { weekday: "short", month: "short", day: "numeric" });
  return `${formatDate(start)}–${new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(end))}`;
}

export function daysUntil(value: string) {
  const now = new Date();
  const target = new Date(value);
  const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `${days} days away`;
}

export function relativeMovement(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Moved today";
  if (days === 1) return "Moved yesterday";
  return `Moved ${days} days ago`;
}
