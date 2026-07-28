"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
  type SlotInfo,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/schedule-calendar.css";
import { ScheduleFormDialog, type ScheduleDialogState } from "@/components/ScheduleFormDialog";
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

const TYPE_COLORS: Record<ScheduleRow["type"], string> = {
  tournee: "#3b82f6",
  conge: "#22c55e",
  absence: "#ef4444",
};

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

function EventContent({ event }: EventProps<ScheduleEvent>) {
  return <span>{event.title}</span>;
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<ScheduleDialogState | null>(null);

  return (
    <>
      <div className="kfm-calendar h-[75vh] rounded-lg border border-border bg-surface p-2">
        <Calendar<ScheduleEvent>
          localizer={localizer}
          events={events}
          views={["month"]}
          defaultView="month"
          culture="fr"
          messages={MESSAGES}
          selectable={!readOnly}
          popup
          components={{ event: EventContent }}
          onSelectSlot={(slot: SlotInfo) => {
            if (readOnly) return;
            setDialogState({ mode: "create", date: format(slot.start, "yyyy-MM-dd") });
            setDialogOpen(true);
          }}
          onSelectEvent={(event: ScheduleEvent) => {
            if (readOnly) return;
            setDialogState({ mode: "edit", entry: event.entry });
            setDialogOpen(true);
          }}
          eventPropGetter={(event: ScheduleEvent) => ({
            style: { backgroundColor: TYPE_COLORS[event.entry.type], border: "none" },
          })}
        />
      </div>

      {!readOnly && (
        <ScheduleFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          state={dialogState}
          drivers={drivers}
          sectors={sectors}
        />
      )}
    </>
  );
}
