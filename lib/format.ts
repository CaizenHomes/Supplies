export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// The business runs on Pacific time. Dates are always shown in this zone, never the
// server's or browser's, so they agree with the budget month and the History month filter.
export const APP_TIME_ZONE = "America/Vancouver";

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
}

export function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
