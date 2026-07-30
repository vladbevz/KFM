import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DocumentBadge } from "@/components/DocumentBadge";
import { getUpcomingEcheances } from "@/lib/echeances";

export default async function EcheancesPage() {
  const supabase = await createClient();
  const rows = await getUpcomingEcheances(supabase, 60);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Échéances à venir</h1>
      <p className="text-sm text-foreground/60">
        Documents véhicules et chauffeurs expirant dans les 60 prochains jours (ou déjà expirés).
      </p>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucune échéance à signaler.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4 hover:border-km"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {row.kind} {row.subject} — {row.docName}
                </p>
              </div>
              <DocumentBadge expiryDate={row.expiryDate} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
