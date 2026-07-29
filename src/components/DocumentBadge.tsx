import { Badge } from "@/components/ui/badge";
import { daysUntil, getExpiryStatus } from "@/lib/documents";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

export function DocumentBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate);

  if (status === "none") {
    return <Badge variant="secondary">Pas d&apos;échéance</Badge>;
  }

  const days = daysUntil(expiryDate!);

  if (status === "expired") {
    return <Badge variant="destructive">Expiré depuis {Math.abs(days)}j</Badge>;
  }
  if (status === "warning") {
    return <Badge variant="warning">Expire dans {days}j ({formatDate(expiryDate!)})</Badge>;
  }
  return <Badge variant="success">OK ({formatDate(expiryDate!)})</Badge>;
}
