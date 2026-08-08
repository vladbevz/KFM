"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TYPE_COLORS } from "@/lib/schedule";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Driver = { id: string; full_name: string };

// Panneau d'aperçu en lecture seule, ouvert au clic sur un jour du
// calendrier — avant, le clic ouvrait directement un formulaire de
// création. Liste tous les chauffeurs actifs et leur statut ce jour-là ;
// cliquer sur un chauffeur ouvre le formulaire (édition si une affectation
// existe déjà, création préemplie sinon).
export function DayPreviewDialog({
  open,
  onOpenChange,
  date,
  drivers,
  sectors,
  entriesByDriver,
  onSelectDriver,
  onAddNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  drivers: Driver[];
  sectors: Sector[];
  entriesByDriver: Map<string, ScheduleRow>;
  onSelectDriver: (driverId: string, existing: ScheduleRow | null) => void;
  onAddNew: () => void;
}) {
  if (!date) return null;

  const sectorById = new Map(sectors.map((s) => [s.id, s]));
  const dateLabel = format(new Date(`${date}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr });

  // Détection de conflit simple (Module 5) : deux chauffeurs sur la même
  // tournée le même jour — juste un signal discret, pas bloquant.
  const driversPerSector = new Map<string, number>();
  for (const entry of entriesByDriver.values()) {
    if (entry.type !== "tournee" || !entry.sector_id) continue;
    driversPerSector.set(entry.sector_id, (driversPerSector.get(entry.sector_id) ?? 0) + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{dateLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto">
          {drivers.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground-muted">
              Aucun chauffeur actif.
            </p>
          ) : (
            drivers.map((driver) => {
              const entry = entriesByDriver.get(driver.id) ?? null;
              const statusLabel = !entry
                ? "Aucune saisie"
                : entry.type === "tournee"
                  ? (sectorById.get(entry.sector_id ?? "")?.code ?? "Tournée")
                  : entry.type === "conge"
                    ? "Congé"
                    : "Absence";
              const color = entry ? TYPE_COLORS[entry.type] : undefined;
              const isPrevu = entry?.source === "prevu";
              const sectorCode =
                entry?.type === "tournee" ? (sectorById.get(entry.sector_id ?? "")?.code ?? null) : null;
              const hasConflict =
                entry?.type === "tournee" &&
                entry.sector_id !== null &&
                (driversPerSector.get(entry.sector_id) ?? 0) >= 2;

              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => onSelectDriver(driver.id, entry)}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium text-foreground">{driver.full_name}</span>
                  <span
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: color ?? undefined }}
                  >
                    {entry && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={
                          isPrevu
                            ? { border: `1.5px dashed ${color}`, backgroundColor: "transparent" }
                            : { backgroundColor: color }
                        }
                      />
                    )}
                    <span className={entry ? "" : "text-foreground-muted"}>
                      {statusLabel}
                      {isPrevu && " (prévu)"}
                    </span>
                    {hasConflict && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning">
                        <title>{`Deux chauffeurs sur la tournée ${sectorCode} aujourd'hui`}</title>
                      </AlertTriangle>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <Button variant="outline" onClick={onAddNew}>
          Ajouter une affectation
        </Button>
      </DialogContent>
    </Dialog>
  );
}
