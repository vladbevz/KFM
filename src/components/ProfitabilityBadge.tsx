import { Badge } from "@/components/ui/badge";
import type { ProfitabilityStatus, ThresholdCheck } from "@/lib/rentabilite";

function ThresholdBadge({ label, check }: { label: string; check: ThresholdCheck }) {
  return (
    <Badge variant={check.met ? "success" : "destructive"} className="tabular-nums">
      {label} {check.actual}/{check.threshold} {check.met ? "✓" : "✗"}
    </Badge>
  );
}

export function ProfitabilityBadges({ status }: { status: ProfitabilityStatus }) {
  switch (status.kind) {
    case "none":
      return <span className="text-xs text-foreground/40">—</span>;

    case "forfait_day":
      return <Badge variant="secondary">Forfait</Badge>;

    case "qty_am_forfait_pm":
      return (
        <div className="flex flex-wrap gap-1.5">
          <ThresholdBadge label="Matin" check={status.matin} />
          <Badge variant="secondary">Forfait AM</Badge>
        </div>
      );

    case "qty_am_qty_pm":
      return (
        <div className="flex flex-wrap gap-1.5">
          <ThresholdBadge label="Matin" check={status.matin} />
          <ThresholdBadge label="AM" check={status.apresMidi} />
        </div>
      );

    case "qty_day":
      return <ThresholdBadge label="Jour" check={status.day} />;
  }
}
