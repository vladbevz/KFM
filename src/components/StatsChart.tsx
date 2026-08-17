"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregateByDate,
  aggregatePosesByDate,
  aggregateTourneesByDate,
  METRIC_OPTIONS,
  type Metric,
  type PeriodKey,
  type PosesDateMetrics,
  type TourneeBar,
} from "@/lib/stats";
import { PAYMENT_TYPE_LABELS, type Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

const tooltipStyle = {
  cursor: { fill: "#1a1d23", opacity: 0.06 },
  contentStyle: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E5EA",
    borderRadius: 8,
    color: "#1A1D23",
  },
  labelStyle: { color: "#1A1D23" },
} as const;

const axisProps = {
  tick: { fill: "#5B616E", fontSize: 12 },
} as const;

const labelProps = {
  fill: "#1A1D23",
  fontSize: 11,
} as const;

function nonZero(value: unknown): string {
  return value === 0 ? "" : String(value);
}

function formatTooltipDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

// Tooltip détaillé pour la barre empilée (poses) : liste chaque tournée du
// jour (code, paiement, contribution) plutôt qu'un simple total agrégé —
// nécessaire dès qu'un jour a plusieurs tournées de types mixtes, sinon un
// total unique masquerait la composition (correction v29).
function PosesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PosesDateMetrics }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-card">
      <p className="mb-1 font-semibold capitalize">{formatTooltipDate(data.date)}</p>
      {data.tournees.length === 0 ? (
        <p className="text-foreground-muted">Aucune tournée.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {data.tournees.map((t, i) => (
            <p key={i} className="tabular-nums">
              <span className="font-medium">{t.sectorCode ?? "?"}</span>
              <span className="text-foreground-muted">
                {" · "}
                {t.paymentType ? PAYMENT_TYPE_LABELS[t.paymentType] : "—"}
                {" · "}
              </span>
              {t.poses + t.enlevements} poses+enl.
            </p>
          ))}
        </div>
      )}
      {data.threshold !== null && (
        <p className="mt-1 tabular-nums text-[#2A5FBF]">Seuil du jour : {data.threshold}</p>
      )}
    </div>
  );
}

// --- Vue par tournée (correction v36) ---------------------------------
// Utilisée uniquement quand un chauffeur précis est affiché (jamais "tous
// les chauffeurs (cumulé)") ET qu'au moins un jour de la période a plusieurs
// tournées : une barre par tournée plutôt qu'une barre fusionnée par jour,
// pour ne jamais comparer le seuil d'une tournée à la pose à un volume
// gonflé par une tournée forfait du même jour.

interface TourneeChartRow extends TourneeBar {
  badgeY: number | null; // position du badge "Forfait", juste au-dessus de la barre
  isLastOfDay: boolean; // dernière sous-barre du groupe du jour (correction v37)
}

function tourneeTotal(bar: TourneeBar): number {
  return bar.delivered + bar.damaged + bar.notDelivered + bar.enlevements;
}

function ThresholdMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  const half = 10;
  return (
    <line
      x1={cx - half}
      x2={cx + half}
      y1={cy}
      y2={cy}
      stroke="#2A5FBF"
      strokeWidth={2}
      strokeDasharray="3 2"
    />
  );
}

function ForfaitBadge({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  return (
    <text x={cx} y={cy} textAnchor="middle" fontSize={10} fill="#5B616E">
      Forfait
    </text>
  );
}

function TourneeBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TourneeChartRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bar = payload[0].payload;
  const total = tourneeTotal(bar);
  const ecart = bar.threshold !== null ? total - bar.threshold : null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-card">
      <p className="mb-1 font-semibold capitalize">
        {formatTooltipDate(bar.date)} — {bar.sectorCode ?? "?"}
      </p>
      <p className="text-foreground-muted">{bar.paymentType ? PAYMENT_TYPE_LABELS[bar.paymentType] : "—"}</p>
      <div className="mt-1 flex flex-col gap-0.5 tabular-nums">
        <span>Livrées : {bar.delivered}</span>
        <span>Avec avarie : {bar.damaged}</span>
        <span>Non livrées : {bar.notDelivered}</span>
        <span>Enlèvements : {bar.enlevements}</span>
      </div>
      {bar.threshold !== null && (
        <p className="mt-1 tabular-nums text-[#2A5FBF]">
          Objectif : {bar.threshold} · Écart : {ecart! > 0 ? `+${ecart}` : ecart}
        </p>
      )}
    </div>
  );
}

function TourneePerBarChart({ bars, showLabels }: { bars: TourneeBar[]; showLabels: boolean }) {
  const data: TourneeChartRow[] = bars.map((b, i) => {
    const next = bars[i + 1];
    return {
      ...b,
      badgeY: b.paymentType === "forfait" ? tourneeTotal(b) + 3 : null,
      isLastOfDay: !next || next.date !== b.date,
    };
  });
  const byKey = new Map(data.map((b) => [b.key, b]));

  // Seuil continu (mobile uniquement, correction v37) : n'a de sens que si
  // toutes les tournées à la pose visibles partagent le même objectif — sinon
  // une ligne unique serait trompeuse, on garde alors le repère localisé
  // même sur mobile (cf. prompt v37, cas ambigu).
  const distinctThresholds = new Set(bars.map((b) => b.threshold).filter((t): t is number => t !== null));
  const uniformThreshold = distinctThresholds.size === 1 ? [...distinctThresholds][0] : null;
  const localizedThresholdClassName = uniformThreshold !== null ? "hidden sm:block" : undefined;

  // Étiquette à deux niveaux sous chaque barre, systématiquement dans le
  // même ordre pour toutes (date en haut, code en bas) : la date n'est
  // rendue que pour la dernière sous-barre du groupe du jour, mais
  // recentrée horizontalement sur le milieu du groupe entier (moyenne entre
  // le x de la première et de la dernière sous-barre, toutes deux fournies
  // par recharts pour cette même passe de rendu) — jamais sous la première
  // sous-barre seule, ce qui donnait l'impression trompeuse que la date
  // n'appartenait qu'à elle (correction v37).
  const firstXByDate = new Map<string, number>();

  function TourneeTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
    if (x == null || y == null || !payload) return null;
    const bar = byKey.get(payload.value);
    if (!bar) return null;
    if (bar.isFirstOfDay) firstXByDate.set(bar.date, x);
    const showDate = bar.isLastOfDay;
    const xFirst = firstXByDate.get(bar.date) ?? x;
    const dateOffsetX = showDate ? (xFirst - x) / 2 : 0;
    return (
      <g transform={`translate(${x},${y})`}>
        {showDate && (
          <text x={dateOffsetX} y={12} textAnchor="middle" fontSize={11} fill="#5B616E">
            {bar.date.slice(5)}
          </text>
        )}
        <text x={0} y={26} textAnchor="middle" fontSize={10} fill="#9AA0AC">
          {bar.sectorCode ?? "?"}
        </text>
      </g>
    );
  }

  // Largeur mini par tournée : en dessous, le code/date et le repère de
  // seuil se chevauchent (mesuré : 60 tournées sur un écran 390px de large
  // rendaient tout illisible). Le graphique défile horizontalement plutôt
  // que de tasser les barres indéfiniment.
  const MIN_SLOT_WIDTH = 30;
  const chartWidth = Math.max(data.length * MIN_SLOT_WIDTH, 100);

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="h-72 w-full overflow-x-auto">
        <div className="h-full" style={{ minWidth: `${chartWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
              <XAxis dataKey="key" tick={<TourneeTick />} interval={0} height={32} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip trigger="click" cursor={tooltipStyle.cursor} content={<TourneeBarTooltip />} />
              <Bar dataKey="delivered" name="Livrées" stackId="poses" fill="#1B8A54" isAnimationActive={false}>
                {showLabels && (
                  <LabelList dataKey="delivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="enlevements" name="Enlèvements" stackId="poses" fill="#1B8A54" isAnimationActive={false}>
                {showLabels && (
                  <LabelList dataKey="enlevements" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="damaged" name="Avec avarie" stackId="poses" fill="#B7791F" isAnimationActive={false}>
                {showLabels && (
                  <LabelList dataKey="damaged" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar
                dataKey="notDelivered"
                name="Non livrées"
                stackId="poses"
                fill="#C4342C"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {showLabels && (
                  <LabelList dataKey="notDelivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              {/* Repère de seuil local (pas une ligne continue) : un point
                  par tournée à la pose, rendu comme un petit trait
                  horizontal cadré sur cette seule barre — jamais de ligne
                  reliant deux tournées entre elles (connectNulls=false +
                  stroke="none"). legendType="none" : légendé via la légende
                  texte sous le graphique plutôt que la Legend recharts
                  (même convention que la note "Zone plus claire" du rendu
                  cumulé, correction v29). Masqué sur mobile (classe
                  responsive) uniquement quand la ligne continue ci-dessous
                  prend le relais — correction v37. */}
              <Line
                dataKey="threshold"
                stroke="none"
                connectNulls={false}
                isAnimationActive={false}
                legendType="none"
                dot={<ThresholdMark />}
                className={localizedThresholdClassName}
              />
              {/* Ligne de seuil continue, mobile uniquement : remplace le
                  repère localisé quand toutes les tournées à la pose
                  visibles partagent le même objectif (cas non ambigu,
                  correction v37). */}
              {uniformThreshold !== null && (
                <ReferenceLine
                  y={uniformThreshold}
                  stroke="#2A5FBF"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  className="sm:hidden"
                />
              )}
              <Line
                dataKey="badgeY"
                stroke="none"
                connectNulls={false}
                isAnimationActive={false}
                legendType="none"
                dot={<ForfaitBadge />}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#5B616E" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-foreground-muted">
        Trait bleu = seuil de rentabilité (tournées à la pose) · « Forfait » = tournée hors objectif.
      </p>
    </div>
  );
}

export function StatsChart({
  entries,
  metric,
  period,
  sectorsById,
  groupByTournee = false,
}: {
  entries: DailyEntry[];
  metric: Metric;
  period: PeriodKey;
  sectorsById: Map<string, Sector>;
  // Réservé à l'affichage d'un chauffeur précis (jamais "tous les
  // chauffeurs (cumulé)", cf. correction v36) — la page appelante sait déjà
  // si un chauffeur précis est sélectionné.
  groupByTournee?: boolean;
}) {
  const showLabels = period === "today" || period === "7";

  if (metric === "poses") {
    if (groupByTournee) {
      const tourneeBars = aggregateTourneesByDate(entries, sectorsById);
      const countByDate = new Map<string, number>();
      for (const b of tourneeBars) countByDate.set(b.date, (countByDate.get(b.date) ?? 0) + 1);
      const hasMultiTournee = [...countByDate.values()].some((c) => c > 1);

      if (hasMultiTournee && tourneeBars.length > 0) {
        return <TourneePerBarChart bars={tourneeBars} showLabels={showLabels} />;
      }
      // Sinon (aucun jour à tournées multiples) : comportement inchangé,
      // continue vers le rendu existant ci-dessous.
    }

    const data = aggregatePosesByDate(entries, sectorsById);

    if (data.length === 0) {
      return (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucune donnée pour cette période.
        </p>
      );
    }

    // N'affecte que les jours avec du volume forfait — un chauffeur qui n'a
    // jamais de tournée forfait ne voit ni opacité réduite ni note, le
    // graphique reste identique à avant (cas majoritaire, correction v29).
    const hasForfait = data.some(
      (d) => d.deliveredForfait + d.damagedForfait + d.notDeliveredForfait + d.enlevementsForfait > 0,
    );

    return (
      <div className="flex w-full flex-col gap-1">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip trigger="click" cursor={tooltipStyle.cursor} content={<PosesTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#5B616E" }} />
              <Bar dataKey="delivered" name="Livrées" stackId="poses" fill="#1B8A54">
                {showLabels && (
                  <LabelList dataKey="delivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="deliveredForfait" stackId="poses" fill="#1B8A54" fillOpacity={0.35} legendType="none">
                {showLabels && (
                  <LabelList dataKey="deliveredForfait" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="enlevements" name="Enlèvements" stackId="poses" fill="#1B8A54">
                {showLabels && (
                  <LabelList dataKey="enlevements" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="enlevementsForfait" stackId="poses" fill="#1B8A54" fillOpacity={0.35} legendType="none">
                {showLabels && (
                  <LabelList dataKey="enlevementsForfait" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="damaged" name="Avec avarie" stackId="poses" fill="#B7791F">
                {showLabels && (
                  <LabelList dataKey="damaged" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="damagedForfait" stackId="poses" fill="#B7791F" fillOpacity={0.35} legendType="none">
                {showLabels && (
                  <LabelList dataKey="damagedForfait" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar dataKey="notDelivered" name="Non livrées" stackId="poses" fill="#C4342C" radius={[4, 4, 0, 0]}>
                {showLabels && (
                  <LabelList dataKey="notDelivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Bar
                dataKey="notDeliveredForfait"
                stackId="poses"
                fill="#C4342C"
                fillOpacity={0.35}
                legendType="none"
                radius={[4, 4, 0, 0]}
              >
                {showLabels && (
                  <LabelList dataKey="notDeliveredForfait" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
                )}
              </Bar>
              <Line
                dataKey="threshold"
                name="Seuil de rentabilité"
                stroke="#2A5FBF"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {hasForfait && (
          <p className="text-xs text-foreground-muted">
            Zone plus claire = tournée forfait, non comptée dans l&apos;objectif.
          </p>
        )}
      </div>
    );
  }

  const option = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const data = aggregateByDate(entries);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        Aucune donnée pour cette période.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: showLabels ? 20 : 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip trigger="click" {...tooltipStyle} />
          <Bar dataKey={metric} name={option.label} fill={option.color} radius={[4, 4, 0, 0]}>
            {showLabels && (
              <LabelList dataKey={metric} position="top" formatter={nonZero} {...labelProps} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
