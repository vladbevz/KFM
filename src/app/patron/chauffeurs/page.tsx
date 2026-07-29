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

export default async function ChauffeursPage() {
  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "driver")
    .order("full_name")
    .returns<{ id: string; full_name: string }[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Chauffeurs</h1>

      {!drivers || drivers.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucun chauffeur pour le moment.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.full_name}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/patron/chauffeurs/${driver.id}`}>Fiche</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
