"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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
} from "@/lib/stats";
import type { Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

const tooltipStyle = {
  cursor: { fill: "#232a3a", opacity: 0.4 },
  contentStyle: {
    backgroundColor: "#161b26",
    border: "1px solid #232a3a",
    borderRadius: 8,
    color: "#e5e7eb",
  },
  labelStyle: { color: "#e5e7eb" },
} as const;

const axisProps = {
  tick: { fill: "#9ca3af", fontSize: 12 },
} as const;

export function StatsChart({
  entries,
  metric,
  sectorsById,
}: {
  entries: DailyEntry[];
  metric: Metric;
  sectorsById: Map<string, Sector>;
}) {
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
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3a" />
            <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
            <Bar dataKey="delivered" name="Livrées" stackId="poses" fill="#22c55e" />
            <Bar dataKey="enlevements" name="Enlèvements" stackId="poses" fill="#22c55e" />
            <Bar dataKey="damaged" name="Avec avarie" stackId="poses" fill="#f59e0b" />
            <Bar
              dataKey="notDelivered"
              name="Non livrées"
              stackId="poses"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
            <Line
              dataKey="threshold"
              name="Seuil de rentabilité"
              stroke="#3b82f6"
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
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232a3a" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey={metric} name={option.label} fill={option.color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
