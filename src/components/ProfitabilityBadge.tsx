import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProfitabilityStatus, ThresholdCheck } from "@/lib/rentabilite";

function ThresholdBadge({ label, check }: { label: string; check: ThresholdCheck }) {
  const Icon = check.met ? CheckCircle2 : XCircle;
  return (
    <Badge variant={check.met ? "success" : "destructive"} className="gap-1 tabular-nums">
      {label} {check.actual}/{check.threshold}
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
    </Badge>
  );
}

export function ProfitabilityBadges({ status }: { status: ProfitabilityStatus }) {
  switch (status.kind) {
    case "none":
      return <span className="text-xs text-foreground-muted">—</span>;

    case "forfait":
      return <Badge variant="secondary">Forfait</Badge>;

    case "a_la_pose":
      return <ThresholdBadge label="Total" check={status.check} />;
  }
}
