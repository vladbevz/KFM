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
} from "@/lib/stats";
import type { Sector } from "@/lib/rentabilite";
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

    return (
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip trigger="click" {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#5B616E" }} />
            <Bar dataKey="delivered" name="Livrées" stackId="poses" fill="#1B8A54">
              {showLabels && (
                <LabelList dataKey="delivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
              )}
            </Bar>
            <Bar dataKey="enlevements" name="Enlèvements" stackId="poses" fill="#1B8A54">
              {showLabels && (
                <LabelList dataKey="enlevements" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
              )}
            </Bar>
            <Bar dataKey="damaged" name="Avec avarie" stackId="poses" fill="#B7791F">
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
            >
              {showLabels && (
                <LabelList dataKey="notDelivered" position="center" formatter={nonZero} {...labelProps} fill="#FFFFFF" />
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
