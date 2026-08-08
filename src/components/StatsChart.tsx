"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregateByDate,
  aggregatePosesByDate,
  METRIC_OPTIONS,
  type Metric,
  type PeriodKey,
  type PosesDateMetrics,
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

export function StatsChart({
  entries,
  metric,
  period,
  sectorsById,
}: {
  entries: DailyEntry[];
  metric: Metric;
  period: PeriodKey;
  sectorsById: Map<string, Sector>;
}) {
  const showLabels = period === "today" || period === "7";

  if (metric === "poses") {
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
