import { createClient } from "@/lib/supabase/server";
import { CarburantControls } from "@/components/CarburantControls";
import { ExpandableCard } from "@/components/ExpandableCard";
import { getPeriodRange, type PeriodKey } from "@/lib/stats";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/types/database";

type FuelLog = Database["public"]["Tables"]["fuel_logs"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

export default async function CarburantPatronPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "")
      ? params.period
      : "30"
  ) as PeriodKey;
  const groupBy = params.groupBy === "vehicule" ? "vehicule" : "chauffeur";
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();

  const [{ data: drivers }, { data: vehicles }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .returns<{ id: string; full_name: string }[]>(),
    supabase.from("vehicles").select("id, plate").returns<{ id: string; plate: string }[]>(),
    supabase
      .from("fuel_logs")
      .select("*")
      .gte("filled_at", from)
      .lte("filled_at", to)
      .order("filled_at", { ascending: false })
      .returns<FuelLog[]>(),
  ]);

  const driverById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v.plate]));

  const rows = logs ?? [];
  const grandTotal = rows.reduce((sum, r) => sum + Number(r.liters), 0);

  const groups = new Map<string, { label: string; liters: number; count: number }>();
  for (const row of rows) {
    const key = groupBy === "chauffeur" ? row.driver_id : row.vehicle_id;
    const label =
      groupBy === "chauffeur"
        ? (driverById.get(row.driver_id) ?? "Chauffeur inconnu")
        : (vehicleById.get(row.vehicle_id) ?? "Véhicule inconnu");
    const current = groups.get(key) ?? { label, liters: 0, count: 0 };
    current.liters += Number(row.liters);
    current.count += 1;
    groups.set(key, current);
  }
  const groupRows = Array.from(groups.values()).sort((a, b) => b.liters - a.liters);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">Carburant</h1>

      <CarburantControls
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        groupBy={groupBy}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground/80">
          Total par {groupBy === "chauffeur" ? "chauffeur" : "véhicule"} —{" "}
          {grandTotal.toFixed(2)} L au total
        </h2>
        {groupRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            Aucun plein sur cette période.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{groupBy === "chauffeur" ? "Chauffeur" : "Véhicule"}</TableHead>
                    <TableHead className="text-right">Pleins</TableHead>
                    <TableHead className="text-right">Total litres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupRows.map((g) => (
                    <TableRow key={g.label}>
                      <TableCell className="font-medium">{g.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.liters.toFixed(2)} L
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 md:hidden">
              {groupRows.map((g) => (
                <div
                  key={g.label}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface shadow-card p-4"
                >
                  <p className="font-medium text-foreground">{g.label}</p>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-medium text-foreground">{g.liters.toFixed(2)} L</p>
                    <p className="text-xs text-foreground-muted">{g.count} pleins</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground/80">Historique brut</h2>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">Aucun plein.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead className="text-right">Litres</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.filled_at)}</TableCell>
                      <TableCell>{driverById.get(log.driver_id) ?? "—"}</TableCell>
                      <TableCell>{vehicleById.get(log.vehicle_id) ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{log.liters}</TableCell>
                      <TableCell className="text-right tabular-nums">{log.odometer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 md:hidden">
              {rows.map((log) => (
                <ExpandableCard
                  key={log.id}
                  header={
                    <div>
                      <p className="font-medium capitalize text-foreground">
                        {formatDate(log.filled_at)}
                      </p>
                      <p className="text-sm text-foreground/70">
                        {vehicleById.get(log.vehicle_id) ?? "—"}
                      </p>
                    </div>
                  }
                  primary={
                    <div className="flex gap-4 text-sm tabular-nums text-foreground/70">
                      <span>
                        <span className="text-foreground-muted">Litres : </span>
                        {log.liters}
                      </span>
                      <span>
                        <span className="text-foreground-muted">Km : </span>
                        {log.odometer}
                      </span>
                    </div>
                  }
                  detail={
                    <p className="text-sm text-foreground/70">
                      Chauffeur : {driverById.get(log.driver_id) ?? "—"}
                    </p>
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
