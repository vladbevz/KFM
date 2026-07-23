import { entryEnlevements, entryKm, entryPoses } from "@/lib/stats";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function HalfDay({
  label,
  numero,
  livraison,
  enlevement,
  courses,
}: {
  label: string;
  numero: string | null;
  livraison: number | null;
  enlevement: number | null;
  courses: string | null;
}) {
  if (numero === null && livraison === null && enlevement === null && !courses) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <p className="font-medium text-foreground/80">{label}</p>
      {numero && <p className="text-foreground/60">N° tournée : {numero}</p>}
      <p className="tabular-nums text-foreground/60">
        Poses livraison : {livraison ?? 0} · Enlèvement : {enlevement ?? 0}
      </p>
      {courses && <p className="text-foreground/60">Courses : {courses}</p>}
    </div>
  );
}

export function EntryCard({
  entry,
  children,
}: {
  entry: DailyEntry;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium capitalize text-foreground">
          {formatDate(entry.entry_date)}
        </p>
        <span className="whitespace-nowrap rounded-full bg-km/10 px-2 py-0.5 text-xs font-medium tabular-nums text-km">
          {entryKm(entry)} km
        </span>
      </div>

      <p className="text-sm text-foreground/60">
        {entry.vehicle_registration} · {entryPoses(entry)} poses ·{" "}
        {entryEnlevements(entry)} enlèvements
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <HalfDay
          label="Matin"
          numero={entry.matin_tournee_numero}
          livraison={entry.matin_poses_livraison}
          enlevement={entry.matin_poses_enlevement}
          courses={entry.matin_courses}
        />
        <HalfDay
          label="Après-midi"
          numero={entry.apres_midi_tournee_numero}
          livraison={entry.apres_midi_poses_livraison}
          enlevement={entry.apres_midi_poses_enlevement}
          courses={entry.apres_midi_courses}
        />
      </div>

      {(entry.anomalie_tournee || entry.anomalie_vehicule) && (
        <div className="flex flex-col gap-1 rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {entry.anomalie_tournee && <p>Tournée : {entry.anomalie_tournee}</p>}
          {entry.anomalie_vehicule && <p>Véhicule : {entry.anomalie_vehicule}</p>}
        </div>
      )}

      {children}
    </div>
  );
}
