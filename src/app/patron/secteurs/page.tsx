import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectorFormDialog } from "@/components/SectorFormDialog";
import type { Database, PaymentModel } from "@/types/database";

type Sector = Database["public"]["Tables"]["sectors"]["Row"];

const PAYMENT_LABELS: Record<PaymentModel, string> = {
  qty_am_qty_pm: "Quantité matin + quantité après-midi",
  qty_am_forfait_pm: "Quantité matin + forfait après-midi",
  forfait_day: "Forfait journée",
  qty_day: "Quantité journée",
};

function thresholdsSummary(sector: Sector): string {
  switch (sector.payment_type) {
    case "qty_am_qty_pm":
      return `Matin ≥ ${sector.morning_threshold} · AM ≥ ${sector.afternoon_threshold}`;
    case "qty_am_forfait_pm":
      return `Matin ≥ ${sector.morning_threshold} · AM forfait`;
    case "forfait_day":
      return "Forfait";
    case "qty_day":
      return `Journée ≥ ${sector.day_threshold}`;
  }
}

export default async function SecteursPage() {
  const supabase = await createClient();

  const { data: sectors } = await supabase
    .from("sectors")
    .select("*")
    .order("code")
    .returns<Sector[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Secteurs</h1>
        <SectorFormDialog trigger={<Button>Nouveau secteur</Button>} />
      </div>

      {!sectors || sectors.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucun secteur créé pour le moment.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Seuils</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectors.map((sector) => (
              <TableRow key={sector.id}>
                <TableCell className="font-medium tabular-nums">{sector.code}</TableCell>
                <TableCell>{PAYMENT_LABELS[sector.payment_type]}</TableCell>
                <TableCell className="tabular-nums text-foreground/70">
                  {thresholdsSummary(sector)}
                </TableCell>
                <TableCell className="text-right">
                  <SectorFormDialog
                    sector={sector}
                    trigger={
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
