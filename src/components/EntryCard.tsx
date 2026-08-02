import { entryEnlevements, entryKm, entryPosesBreakdown } from "@/lib/stats";
import { entryProfitability, resolveEntrySector } from "@/lib/rentabilite";
import { ProfitabilityBadges } from "@/components/ProfitabilityBadge";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

const TOURNEE_TYPE_LABELS: Record<NonNullable<DailyEntry["tournee_type"]>, string> = {
  journee: "Journée",
  demi_journee: "Demi-journée",
};

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
  sectorCode,
  livraison,
  enlevement,
  courses,
}: {
  label: string;
  sectorCode: string | null;
  livraison: number | null;
  enlevement: number | null;
  courses: string | null;
}) {
  if (sectorCode === null && livraison === null && enlevement === null && !courses) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <p className="font-medium text-foreground/80">{label}</p>
      {sectorCode && <p className="text-foreground/60">Secteur : {sectorCode}</p>}
      <p className="tabular-nums text-foreground/60">
        Poses livraison : {livraison ?? 0} · Enlèvement : {enlevement ?? 0}
      </p>
      {courses && <p className="text-foreground/60">Courses : {courses}</p>}
    </div>
  );
}

export function EntryCard({
  entry,
  sectors,
  children,
}: {
  entry: DailyEntry;
  sectors: Sector[];
  children?: React.ReactNode;
}) {
  const sectorsById = new Map(sectors.map((s) => [s.id, s]));
  const profitability = entryProfitability(entry, resolveEntrySector(entry, sectorsById));
  const isNewFlow = Boolean(entry.tournee_type);

  const sectorCode = isNewFlow
    ? (entry.sector_id ? (sectorsById.get(entry.sector_id)?.code ?? null) : null)
    : null;
  const matinSectorCode = entry.matin_sector_id
    ? (sectorsById.get(entry.matin_sector_id)?.code ?? null)
    : entry.matin_tournee_numero;
  const apresMidiSectorCode = entry.apres_midi_sector_id
    ? (sectorsById.get(entry.apres_midi_sector_id)?.code ?? null)
    : entry.apres_midi_tournee_numero;

  const poses = entryPosesBreakdown(entry);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium capitalize text-foreground">
          {formatDate(entry.entry_date)}
          {isNewFlow && (
            <span className="ml-2 text-xs font-normal text-foreground/50">
              {TOURNEE_TYPE_LABELS[entry.tournee_type!]}
            </span>
          )}
        </p>
        <span className="whitespace-nowrap rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
          {entryKm(entry)} km
        </span>
      </div>

      <p className="text-sm tabular-nums text-foreground/60">
        {entry.vehicle_registration ?? "—"} · {poses.delivered + poses.damaged + poses.notDelivered} poses ·{" "}
        {entryEnlevements(entry)} enlèvements
      </p>

      <ProfitabilityBadges status={profitability} />

      {isNewFlow ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
            {sectorCode && <p className="text-foreground/60">Secteur : {sectorCode}</p>}
            <p className="tabular-nums text-foreground/60">
              Livrées : {poses.delivered} · Avec avarie : {poses.damaged} · Non livrées :{" "}
              {poses.notDelivered}
            </p>
            {entry.courses && <p className="text-foreground/60">Courses : {entry.courses}</p>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <HalfDay
            label="Matin"
            sectorCode={matinSectorCode}
            livraison={entry.matin_poses_livraison}
            enlevement={entry.matin_poses_enlevement}
            courses={entry.matin_courses}
          />
          <HalfDay
            label="Après-midi"
            sectorCode={apresMidiSectorCode}
            livraison={entry.apres_midi_poses_livraison}
            enlevement={entry.apres_midi_poses_enlevement}
            courses={entry.apres_midi_courses}
          />
        </div>
      )}

      {(entry.anomalie_tournee || entry.anomalie_vehicule) && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-[#FBE7E5] px-3 py-2 text-sm text-destructive">
          {entry.anomalie_tournee && <p>Tournée : {entry.anomalie_tournee}</p>}
          {entry.anomalie_vehicule && <p>Véhicule : {entry.anomalie_vehicule}</p>}
        </div>
      )}

      {children}
    </div>
  );
}
