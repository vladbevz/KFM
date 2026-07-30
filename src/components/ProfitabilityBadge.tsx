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

    case "forfait":
      return <Badge variant="secondary">Forfait</Badge>;

    case "a_la_pose":
      return <ThresholdBadge label="Total" check={status.check} />;
  }
}
