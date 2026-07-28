import { Badge } from "@/components/ui/badge";
import type { VehicleStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "info" }
> = {
  operational: { label: "Opérationnel", variant: "success" },
  issue_running: { label: "Panne signalée", variant: "warning" },
  unavailable: { label: "Indisponible", variant: "destructive" },
  in_repair: { label: "En réparation", variant: "info" },
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
