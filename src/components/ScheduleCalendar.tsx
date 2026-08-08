"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
  type SlotInfo,
} from "react-big-calendar";
import { addMonths, format, getDay, parse, startOfWeek, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/schedule-calendar.css";
import { Button } from "@/components/ui/button";
import { ScheduleFormDialog, type ScheduleDialogState } from "@/components/ScheduleFormDialog";
import { DayPreviewDialog } from "@/components/DayPreviewDialog";
import { TYPE_COLORS } from "@/lib/schedule";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Driver = { id: string; full_name: string };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { fr },
});

interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  entry: ScheduleRow;
}

const MESSAGES = {
  today: "Aujourd'hui",
  previous: "Précédent",
  next: "Suivant",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Évènement",
  noEventsInRange: "Aucune affectation sur cette période.",
  showMore: (total: number) => `+ ${total} de plus`,
};

// Écart entre la tournée prévue et celle réellement démarrée (Module 2) :
// planned_sector_id n'est renseigné que quand une entrée "prevu" est passée
// à "reel" au démarrage — s'il diffère du secteur réel, c'est un écart.
function hasMismatch(entry: ScheduleRow): boolean {
  return (
    entry.source === "reel" &&
    entry.planned_sector_id !== null &&
    entry.planned_sector_id !== entry.sector_id
  );
}

function EventContent({ event }: EventProps<ScheduleEvent>) {
  return (
    <span className="flex items-center gap-1">
      <span className="truncate">{event.title}</span>
      {hasMismatch(event.entry) && (
        <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2}>
          <title>Tournée réelle différente de la tournée prévue</title>
        </AlertTriangle>
      )}
    </span>
  );
}

// Toolbar maison, rendue hors de .kfm-calendar : la barre d'outils par
// défaut de react-big-calendar groupe Aujourd'hui/Précédent/Suivant dans un
// même .rbc-btn-group à gauche du mois (déséquilibré), et ce groupe coupe
// le contour/l'ombre au survol de ses boutons. Ici, Précédent/Suivant
// encadrent le mois centré (pattern calendrier standard), "Aujourd'hui" est
// séparé à gauche, et chaque bouton a son propre contour non rogné.
function CalendarToolbar({ date, onNavigate }: { date: Date; onNavigate: (date: Date) => void }) {
  const label = format(date, "LLLL yyyy", { locale: fr });
  return (
    <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div>
        <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
          Aujourd&apos;hui
        </Button>
      </div>
      <div className="flex items-center gap-2 justify-self-center">
        <button
          type="button"
          onClick={() => onNavigate(subMonths(date, 1))}
          aria-label="Mois précédent"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:border-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <span className="min-w-[10rem] text-center text-base font-semibold capitalize text-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onNavigate(addMonths(date, 1))}
          aria-label="Mois suivant"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:border-foreground hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
      <div />
    </div>
  );
}

export function ScheduleCalendar({
  entries,
  drivers,
  sectors,
  readOnly = false,
}: {
  entries: ScheduleRow[];
  drivers: Driver[];
  sectors: Sector[];
  readOnly?: boolean;
}) {
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const sectorById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);

  const events: ScheduleEvent[] = useMemo(
    () =>
      entries.map((entry) => {
        const driverName = driverById.get(entry.driver_id)?.full_name ?? "?";
        const suffix =
          entry.type === "tournee"
            ? (sectorById.get(entry.sector_id ?? "")?.code ?? "Tournée")
            : entry.type === "conge"
              ? "Congé"
              : "Absence";
        const date = new Date(`${entry.date}T00:00:00`);
        return {
          id: entry.id,
          title: `${driverName} — ${suffix}`,
          start: date,
          end: date,
          allDay: true,
          entry,
        };
      }),
    [entries, driverById, sectorById],
  );

  const [currentDate, setCurrentDate] = useState(new Date());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<ScheduleDialogState | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  // Clic sur un jour -> aperçu en lecture seule d'abord (Module 1) ; clic
  // sur un chauffeur dans l'aperçu, ou "Ajouter une affectation", ouvre
  // ensuite le vrai formulaire.
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleRow>>();
    for (const entry of entries) {
      const byDriver = map.get(entry.date) ?? new Map<string, ScheduleRow>();
      byDriver.set(entry.driver_id, entry);
      map.set(entry.date, byDriver);
    }
    return map;
  }, [entries]);

  return (
    <>
      <CalendarToolbar date={currentDate} onNavigate={setCurrentDate} />

      <div className="kfm-calendar h-[75vh] rounded-lg border border-border bg-surface p-2">
        <Calendar<ScheduleEvent>
          localizer={localizer}
          events={events}
          views={["month"]}
          defaultView="month"
          date={currentDate}
          onNavigate={setCurrentDate}
          toolbar={false}
          culture="fr"
          messages={MESSAGES}
          selectable={!readOnly}
          popup
          components={{ event: EventContent }}
          onSelectSlot={(slot: SlotInfo) => {
            if (readOnly) return;
            setPreviewDate(format(slot.start, "yyyy-MM-dd"));
            setPreviewOpen(true);
          }}
          onSelectEvent={(event: ScheduleEvent) => {
            if (readOnly) return;
            setDialogState({ mode: "edit", entry: event.entry });
            setDialogOpen(true);
          }}
          eventPropGetter={(event: ScheduleEvent) => {
            const color = TYPE_COLORS[event.entry.type];
            // "prevu" (planifié, pas encore confirmé par le chauffeur) :
            // contour en pointillés sur fond clair, pour rester visuellement
            // distinct du plein "reel" sans être moins lisible.
            const isPrevu = event.entry.source === "prevu";
            return {
              style: isPrevu
                ? {
                    backgroundColor: `${color}22`,
                    color,
                    border: `1.5px dashed ${color}`,
                  }
                : { backgroundColor: color, border: "none" },
            };
          }}
        />
      </div>

      {!readOnly && (
        <>
          <DayPreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            date={previewDate}
            drivers={drivers}
            sectors={sectors}
            entriesByDriver={(previewDate && entriesByDate.get(previewDate)) || new Map()}
            onSelectDriver={(driverId, existing) => {
              setPreviewOpen(false);
              setDialogState(
                existing
                  ? { mode: "edit", entry: existing }
                  : { mode: "create", date: previewDate!, driverId },
              );
              setDialogOpen(true);
            }}
            onAddNew={() => {
              setPreviewOpen(false);
              setDialogState({ mode: "create", date: previewDate! });
              setDialogOpen(true);
            }}
          />

          <ScheduleFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            state={dialogState}
            drivers={drivers}
            sectors={sectors}
          />
        </>
      )}
    </>
  );
}
