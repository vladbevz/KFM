import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database";

type CongeRequest = Database["public"]["Tables"]["conge_requests"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

function statusBadge(status: CongeRequest["status"]) {
  switch (status) {
    case "approved":
      return <Badge variant="success">Approuvée</Badge>;
    case "rejected":
      return <Badge variant="destructive">Refusée</Badge>;
    case "pending":
      return <Badge variant="warning">En attente</Badge>;
  }
}

export function CongeRequestsList({ requests }: { requests: CongeRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-foreground-muted">
        Aucune demande de congé pour le moment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground/80">Mes demandes</h2>
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
        >
          <div>
            <p className="text-sm font-medium tabular-nums text-foreground">
              {formatDate(req.start_date)} — {formatDate(req.end_date)}
            </p>
            {req.note && <p className="text-sm text-foreground-muted">{req.note}</p>}
          </div>
          {statusBadge(req.status)}
        </div>
      ))}
    </div>
  );
}
