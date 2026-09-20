import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CongeRequestReviewButtons } from "@/components/CongeRequestReviewButtons";
import type { Database } from "@/types/database";

type CongeRequest = Database["public"]["Tables"]["conge_requests"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
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

export default async function CongeRequestsPage() {
  const supabase = await createClient();

  const [{ data: requests }, { data: drivers }] = await Promise.all([
    supabase
      .from("conge_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CongeRequest[]>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .returns<{ id: string; full_name: string }[]>(),
  ]);

  const driverNameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
  const all = requests ?? [];
  const pending = all.filter((r) => r.status === "pending");
  const decided = all.filter((r) => r.status !== "pending");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Calendrier</h1>

      {/* Même barre d'onglets que Calendrier/Planificateur — on ne veut pas
          que "Demandes de congé" soit un cul-de-sac obligeant à repasser
          par Calendrier pour rejoindre Planificateur, et inversement. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patron/calendrier">Calendrier</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/patron/calendrier/planificateur">Planificateur</Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href="/patron/calendrier/demandes" className="inline-flex items-center gap-1.5">
            Demandes de congé
            {pending.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                {pending.length}
              </span>
            )}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">En attente</h2>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-muted">Aucune demande en attente.</p>
        ) : (
          pending.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface shadow-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{driverNameById.get(req.driver_id) ?? "—"}</p>
                <p className="text-sm tabular-nums text-foreground-muted">
                  {formatDate(req.start_date)} — {formatDate(req.end_date)}
                </p>
                {req.note && <p className="text-sm text-foreground-muted">{req.note}</p>}
              </div>
              <CongeRequestReviewButtons id={req.id} />
            </div>
          ))
        )}
      </div>

      {decided.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">Historique</h2>
          {decided.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
            >
              <div>
                <p className="font-medium text-foreground">{driverNameById.get(req.driver_id) ?? "—"}</p>
                <p className="text-sm tabular-nums text-foreground-muted">
                  {formatDate(req.start_date)} — {formatDate(req.end_date)}
                </p>
              </div>
              {statusBadge(req.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
