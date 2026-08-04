export function KpiCard({
  value,
  label,
  valueClassName,
  className,
}: {
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 rounded-2xl border border-border bg-surface shadow-card p-4 ${className ?? ""}`}
    >
      <p className={`text-2xl font-semibold tabular-nums ${valueClassName ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-foreground/50">{label}</p>
    </div>
  );
}
