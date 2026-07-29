export type ExpiryStatus = "none" | "ok" | "warning" | "expired";

const WARNING_WINDOW_DAYS = 30;

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= WARNING_WINDOW_DAYS) return "warning";
  return "ok";
}

export function daysUntil(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  return Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
}
