import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  if (sector.payment_type !== "a_la_pose") return "Forfait";
  const base = `Livr. ≥ ${sector.rentability_target}`;
  return sector.target_enlevements != null ? `${base} · Enl. ≥ ${sector.target_enlevements}` : base;
}

function tariffSummary(
  sector: Sector,
  price: number | null | undefined,
  enlevementPrice: number | null | undefined,
  forfaitAmount: number | null | undefined,
): string {
  if (sector.payment_type !== "a_la_pose") {
    return forfaitAmount != null ? `${forfaitAmount.toFixed(2)} € (forfait)` : "Non renseigné";
  }
  if (price == null) return "Non renseigné";
  return enlevementPrice != null
    ? `${price.toFixed(2)} €/pose · ${enlevementPrice.toFixed(2)} €/enl.`
    : `${price.toFixed(2)} €/pose`;
}

export default async function SecteursPage() {
  const supabase = await createClient();

  const [{ data: sectors }, { data: prices }, { data: forfaitAmounts }] = await Promise.all([
    supabase.from("sectors").select("*").order("code").returns<Sector[]>(),
    supabase
      .from("sector_prices")
      .select("sector_id, price_per_pose, price_per_enlevement")
      .returns<{ sector_id: string; price_per_pose: number | null; price_per_enlevement: number | null }[]>(),
    supabase
      .from("sector_forfait_amounts")
      .select("sector_id, forfait_amount")
      .returns<{ sector_id: string; forfait_amount: number | null }[]>(),
  ]);
  const priceBySectorId = new Map((prices ?? []).map((p) => [p.sector_id, p.price_per_pose]));
  const enlevementPriceBySectorId = new Map((prices ?? []).map((p) => [p.sector_id, p.price_per_enlevement]));
  const forfaitBySectorId = new Map((forfaitAmounts ?? []).map((f) => [f.sector_id, f.forfait_amount]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/patron/rentabilite"
            className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Rentabilité
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Tournées</h1>
        </div>
        <SectorFormDialog trigger={<Button>Nouvelle tournée</Button>} />
      </div>

      {!sectors || sectors.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucune tournée créée pour le moment.
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
                  <TableHead>Tarif</TableHead>
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
                    <TableCell className="tabular-nums text-foreground/70">
                      {tariffSummary(
                        sector,
                        priceBySectorId.get(sector.id),
                        enlevementPriceBySectorId.get(sector.id),
                        forfaitBySectorId.get(sector.id),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <SectorFormDialog
                        sector={sector}
                        currentPrice={priceBySectorId.get(sector.id)}
                        currentEnlevementPrice={enlevementPriceBySectorId.get(sector.id)}
                        currentForfaitAmount={forfaitBySectorId.get(sector.id)}
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
                  <p className="text-sm tabular-nums text-foreground-muted">
                    Tarif :{" "}
                    {tariffSummary(
                      sector,
                      priceBySectorId.get(sector.id),
                      enlevementPriceBySectorId.get(sector.id),
                      forfaitBySectorId.get(sector.id),
                    )}
                  </p>
                </div>
                <SectorFormDialog
                  sector={sector}
                  currentPrice={priceBySectorId.get(sector.id)}
                  currentEnlevementPrice={enlevementPriceBySectorId.get(sector.id)}
                  currentForfaitAmount={forfaitBySectorId.get(sector.id)}
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
