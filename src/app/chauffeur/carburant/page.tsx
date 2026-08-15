import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { FuelLogForm } from "@/components/FuelLogForm";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type FuelLog = Database["public"]["Tables"]["fuel_logs"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

export default async function CarburantPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: vehicles }, { data: logs }, { data: profile }] = await Promise.all([
    // Non filtré : l'historique ci-dessous doit continuer à afficher la
    // plaque même pour un plein passé sur un véhicule depuis retiré. Seul le
    // formulaire (véhicules sélectionnables) exclut les retirés.
    supabase.from("vehicles").select("*").order("plate").returns<Vehicle[]>(),
    supabase
      .from("fuel_logs")
      .select("*")
      .eq("driver_id", user!.id)
      .order("filled_at", { ascending: false })
      .returns<FuelLog[]>(),
    supabase
      .from("profiles")
      .select("default_vehicle_id")
      .eq("id", user!.id)
      .single<{ default_vehicle_id: string | null }>(),
  ]);

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));
  const selectableVehicles = (vehicles ?? []).filter((v) => !v.retired);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      {/* min-h calé sur le viewport, avec une marge de sécurité généreuse
          (8rem) plutôt qu'un calcul pile-poil : un calc(100dvh-2rem) trop
          serré a déjà causé une régression sur appareil réel (bouton
          "Signaler" de l'écran Panne masqué sous la nav — police/dvh réels
          ne correspondant pas exactement à ce qui avait été mesuré en
          headless). Ici la liste peut peut-être dépasser de quelques px sur
          certains appareils, ce qui est sans conséquence — contrairement à
          un bouton d'action masqué. */}
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col justify-center gap-6">
        <h1 className="text-lg font-semibold text-foreground">Carburant</h1>
        <FuelLogForm vehicles={selectableVehicles} defaultVehicleId={profile?.default_vehicle_id} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">Historique des pleins</h2>

        {!logs || logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            Aucun plein enregistré pour le moment.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface shadow-card p-4"
            >
              <div>
                <p className="text-sm font-medium capitalize text-foreground">
                  {formatDate(log.filled_at)}
                </p>
                <p className="text-sm text-foreground/60">
                  {vehicleById.get(log.vehicle_id)?.plate ?? "Véhicule inconnu"}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-sm font-medium text-foreground">{log.liters} L</p>
                <p className="text-xs text-foreground/50">{log.odometer} km</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
