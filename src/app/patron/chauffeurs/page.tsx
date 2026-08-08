import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDriverDialog } from "@/components/CreateDriverDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ChauffeursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const showInactive = params.filter === "inactive";

  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name, active")
    .eq("role", "driver")
    .eq("active", !showInactive)
    .order("full_name")
    .returns<{ id: string; full_name: string; active: boolean }[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Chauffeurs</h1>

      <CreateDriverDialog trigger={<Button className="w-full self-start sm:w-auto">Ajouter un chauffeur</Button>} />

      <div className="flex flex-wrap gap-2">
        <Link href="/patron/chauffeurs">
          <Button variant={showInactive ? "outline" : "default"} size="sm">
            Actifs
          </Button>
        </Link>
        <Link href="/patron/chauffeurs?filter=inactive">
          <Button variant={showInactive ? "default" : "outline"} size="sm">
            Anciens chauffeurs
          </Button>
        </Link>
      </div>

      {!drivers || drivers.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          {showInactive ? "Aucun ancien chauffeur." : "Aucun chauffeur pour le moment."}
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={driver.active ? "success" : "secondary"}>
                        {driver.active ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/patron/chauffeurs/${driver.id}`}>Fiche</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">{driver.full_name}</p>
                  <Badge variant={driver.active ? "success" : "secondary"} className="w-fit">
                    {driver.active ? "Actif" : "Désactivé"}
                  </Badge>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/patron/chauffeurs/${driver.id}`}>Fiche conducteur</Link>
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
