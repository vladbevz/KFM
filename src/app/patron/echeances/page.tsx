import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DocumentBadge } from "@/components/DocumentBadge";
import type { Database } from "@/types/database";

type VehicleDocument = Database["public"]["Tables"]["vehicle_documents"]["Row"];
type DriverDocument = Database["public"]["Tables"]["driver_documents"]["Row"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function EcheancesPage() {
  const supabase = await createClient();

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);
  const horizonStr = toISODate(horizon);

  const [{ data: vehicleDocs }, { data: driverDocs }, { data: vehicles }, { data: drivers }] =
    await Promise.all([
      supabase
        .from("vehicle_documents")
        .select("*")
        .not("expiry_date", "is", null)
        .lte("expiry_date", horizonStr)
        .returns<VehicleDocument[]>(),
      supabase
        .from("driver_documents")
        .select("*")
        .not("expiry_date", "is", null)
        .lte("expiry_date", horizonStr)
        .returns<DriverDocument[]>(),
      supabase.from("vehicles").select("id, plate").returns<{ id: string; plate: string }[]>(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "driver")
        .returns<{ id: string; full_name: string }[]>(),
    ]);

  const vehiclePlateById = new Map((vehicles ?? []).map((v) => [v.id, v.plate]));
  const driverNameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));

  const rows = [
    ...(vehicleDocs ?? []).map((doc) => ({
      id: `vehicle-${doc.id}`,
      kind: "Véhicule" as const,
      subject: vehiclePlateById.get(doc.vehicle_id) ?? "Véhicule inconnu",
      docName: doc.doc_name,
      expiryDate: doc.expiry_date!,
      href: `/patron/vehicules/${doc.vehicle_id}`,
    })),
    ...(driverDocs ?? []).map((doc) => ({
      id: `driver-${doc.id}`,
      kind: "Chauffeur" as const,
      subject: driverNameById.get(doc.driver_id) ?? "Chauffeur inconnu",
      docName: doc.doc_name,
      expiryDate: doc.expiry_date!,
      href: `/patron/chauffeurs/${doc.driver_id}`,
    })),
  ].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

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
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-4 hover:border-km"
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
