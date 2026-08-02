import Link from "next/link";
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
import { VehicleFormDialog } from "@/components/VehicleFormDialog";
import { VehicleStatusBadge } from "@/components/VehicleStatusBadge";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export default async function VehiculesPage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .order("plate")
    .returns<Vehicle[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Véhicules</h1>
        <VehicleFormDialog trigger={<Button>Nouveau véhicule</Button>} />
      </div>

      {!vehicles || vehicles.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucun véhicule enregistré pour le moment.
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Repère</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium tabular-nums">{vehicle.plate}</TableCell>
                    <TableCell className="text-foreground/70">{vehicle.label ?? "—"}</TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <VehicleFormDialog
                        vehicle={vehicle}
                        trigger={
                          <Button variant="outline" size="sm">
                            Modifier
                          </Button>
                        }
                      />
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/patron/vehicules/${vehicle.id}`}>Détail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium tabular-nums text-foreground">{vehicle.plate}</p>
                    {vehicle.label && (
                      <p className="text-sm text-foreground/70">{vehicle.label}</p>
                    )}
                  </div>
                  <VehicleStatusBadge status={vehicle.status} />
                </div>
                <div className="flex gap-2">
                  <VehicleFormDialog
                    vehicle={vehicle}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        Modifier
                      </Button>
                    }
                  />
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/patron/vehicules/${vehicle.id}`}>Détail</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
