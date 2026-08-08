"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScheduleFormDialog, type ScheduleDialogState } from "@/components/ScheduleFormDialog";
import { TYPE_COLORS, addDaysISO, isoDate } from "@/lib/schedule";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Driver = { id: string; full_name: string };

// Vue tableau chauffeurs x jours, pour assigner rapidement plusieurs jours
// à l'avance — filtrable pour se concentrer sur les chauffeurs "bouche-trou"
// qui changent de tournée souvent. Réutilise ScheduleFormDialog (même
// composant que le calendrier mensuel) plutôt qu'un formulaire dédié.
// Toutes les affectations créées ici sont "prevu" (saveScheduleEntry).
export function WeeklyPlanner({
  weekStart,
  drivers,
  sectors,
  entries,
}: {
  weekStart: string;
  drivers: Driver[];
  sectors: Sector[];
  entries: ScheduleRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);
  const sectorById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);

  const entriesByDriverDate = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleRow>>();
    for (const entry of entries) {
      const byDate = map.get(entry.driver_id) ?? new Map<string, ScheduleRow>();
      byDate.set(entry.date, entry);
      map.set(entry.driver_id, byDate);
    }
    return map;
  }, [entries]);

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.full_name.toLowerCase().includes(q));
  }, [drivers, search]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<ScheduleDialogState | null>(null);

  function openCell(driverId: string, date: string, existing: ScheduleRow | null) {
    setDialogState(existing ? { mode: "edit", entry: existing } : { mode: "create", date, driverId });
    setDialogOpen(true);
  }

  function goWeek(offsetDays: number) {
    router.push(`/patron/calendrier/planificateur?week=${addDaysISO(weekStart, offsetDays)}`);
  }

  const today = isoDate(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer un chauffeur..."
            className="max-w-[220px]"
          />
        </div>
        <div className="flex items-center gap-2 justify-self-center">
          <button
            type="button"
            onClick={() => goWeek(-7)}
            aria-label="Semaine précédente"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:border-foreground hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <span className="min-w-[14rem] text-center text-base font-semibold text-foreground">
            Semaine du {format(new Date(`${weekStart}T00:00:00`), "d MMMM yyyy", { locale: fr })}
          </span>
          <button
            type="button"
            onClick={() => goWeek(7)}
            aria-label="Semaine suivante"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:border-foreground hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div className="justify-self-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patron/calendrier/planificateur")}
          >
            Cette semaine
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium text-foreground/70">
                Chauffeur
              </th>
              {days.map((date) => {
                const isToday = date === today;
                return (
                  <th
                    key={date}
                    className={`px-2 py-2 text-center font-medium ${isToday ? "text-foreground" : "text-foreground/70"}`}
                  >
                    <div className="capitalize">
                      {format(new Date(`${date}T00:00:00`), "EEE", { locale: fr })}
                    </div>
                    <div className={`tabular-nums ${isToday ? "font-semibold" : ""}`}>
                      {format(new Date(`${date}T00:00:00`), "d MMM", { locale: fr })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-foreground-muted">
                  Aucun chauffeur ne correspond au filtre.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-foreground">
                    {driver.full_name}
                  </td>
                  {days.map((date) => {
                    const entry = entriesByDriverDate.get(driver.id)?.get(date) ?? null;
                    const color = entry ? TYPE_COLORS[entry.type] : undefined;
                    const isPrevu = entry?.source === "prevu";
                    const label = !entry
                      ? ""
                      : entry.type === "tournee"
                        ? (sectorById.get(entry.sector_id ?? "")?.code ?? "Tournée")
                        : entry.type === "conge"
                          ? "Congé"
                          : "Absence";
                    return (
                      <td key={date} className="px-1.5 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => openCell(driver.id, date, entry)}
                          className={`flex h-9 w-full min-w-[72px] items-center justify-center rounded-md text-xs font-medium transition-colors ${
                            entry
                              ? "hover:opacity-80"
                              : "border border-dashed border-border text-foreground-muted hover:border-foreground hover:text-foreground"
                          }`}
                          style={
                            entry
                              ? isPrevu
                                ? { border: `1.5px dashed ${color}`, color, backgroundColor: `${color}22` }
                                : { backgroundColor: color, color: "#fff" }
                              : undefined
                          }
                        >
                          {label || "+"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ScheduleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={dialogState}
        drivers={drivers}
        sectors={sectors}
      />
    </div>
  );
}
