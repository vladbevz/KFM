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
import { PAYMENT_TYPE_LABELS } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type Sector = Database["public"]["Tables"]["sectors"]["Row"];

function thresholdsSummary(sector: Sector): string {
  return sector.payment_type === "a_la_pose"
    ? `Objectif ≥ ${sector.rentability_target}`
    : "Forfait";
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
        <>
          <div className="hidden md:block">
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
                    <TableCell>{PAYMENT_TYPE_LABELS[sector.payment_type]}</TableCell>
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
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {sectors.map((sector) => (
              <div
                key={sector.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
              >
                <div>
                  <p className="font-medium tabular-nums text-foreground">{sector.code}</p>
                  <p className="text-sm text-foreground/70">{PAYMENT_TYPE_LABELS[sector.payment_type]}</p>
                  <p className="text-sm tabular-nums text-foreground-muted">
                    {thresholdsSummary(sector)}
                  </p>
                </div>
                <SectorFormDialog
                  sector={sector}
                  trigger={
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
