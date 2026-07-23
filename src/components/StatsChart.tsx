"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { METRIC_OPTIONS, type DateMetrics, type Metric } from "@/lib/stats";

export function StatsChart({
  data,
  metric,
}: {
  data: DateMetrics[];
  metric: Metric;
}) {
  const option = METRIC_OPTIONS.find((m) => m.key === metric)!;

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
          <XAxis
            dataKey="date"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#232a3a", opacity: 0.4 }}
            contentStyle={{
              backgroundColor: "#161b26",
              border: "1px solid #232a3a",
              borderRadius: 8,
              color: "#e5e7eb",
            }}
            labelStyle={{ color: "#e5e7eb" }}
          />
          <Bar dataKey={metric} name={option.label} fill={option.color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
