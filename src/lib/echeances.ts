import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type VehicleDocument = Database["public"]["Tables"]["vehicle_documents"]["Row"];
type DriverDocument = Database["public"]["Tables"]["driver_documents"]["Row"];

export interface Echeance {
  id: string;
  kind: "Véhicule" | "Chauffeur";
  subject: string;
  docName: string;
  expiryDate: string;
  href: string;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Documents véhicules/chauffeurs expirant dans les `horizonDays` prochains
// jours (ou déjà expirés), fusionnés et triés par date d'échéance. Réutilisé
// par la page Échéances complète et par le bloc du même nom sur l'accueil.
export async function getUpcomingEcheances(
  supabase: SupabaseServerClient,
  horizonDays = 60,
): Promise<Echeance[]> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);
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

  return [
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
}
