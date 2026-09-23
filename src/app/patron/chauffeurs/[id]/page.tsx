import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailHeader } from "@/components/DetailHeader";
import { DriverActiveToggle } from "@/components/DriverActiveToggle";
import { DriverResetPasswordButton } from "@/components/DriverResetPasswordButton";
import { DriverDocumentDialog } from "@/components/DriverDocumentDialog";
import { DocumentsList, type DocumentItem } from "@/components/DocumentsList";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";
import { deleteDriverDocument } from "@/app/patron/chauffeurs/actions";
import { resolveEntrySector, type Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DriverDocument = Database["public"]["Tables"]["driver_documents"]["Row"];
type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

function statusBadge(entry: DailyEntry) {
  if (entry.status === "in_progress") return <Badge variant="info">En tournée</Badge>;
  return null;
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: driver }, { data: documents }, { data: entries }, { data: sectors }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active")
      .eq("id", id)
      .maybeSingle<{ id: string; full_name: string; role: string; active: boolean }>(),
    supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .returns<DriverDocument[]>(),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("driver_id", id)
      .order("entry_date", { ascending: false })
      .order("started_at", { ascending: false })
      .returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
  ]);

  if (!driver || driver.role !== "driver") notFound();

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));

  const documentItems: DocumentItem[] = [];
  for (const doc of documents ?? []) {
    let signedUrl: string | null = null;
    if (doc.file_url) {
      const { data: signed } = await supabase.storage
        .from("driver-documents")
        .createSignedUrl(doc.file_url, 3600);
      signedUrl = signed?.signedUrl ?? null;
    }
    documentItems.push({
      id: doc.id,
      doc_name: doc.doc_name,
      expiry_date: doc.expiry_date,
      signedUrl,
    });
  }

  return (
    // Largeur plafonnée (cohérent avec Notifications) : une seule colonne de
    // contenu étirée sur toute la largeur desktop laissait plus de la moitié
    // de l'écran vide sur cette fiche — ajustement de densité, pas une
    // nouvelle structure.
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DetailHeader title={driver.full_name} />
          <Badge variant={driver.active ? "success" : "secondary"}>
            {driver.active ? "Actif" : "Désactivé"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <DriverResetPasswordButton driverId={driver.id} />
          <DriverActiveToggle driverId={driver.id} active={driver.active} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">Documents</h2>
          <DriverDocumentDialog
            driverId={driver.id}
            trigger={
              <Button variant="outline" size="sm">
                Ajouter un document
              </Button>
            }
          />
        </div>
        <DocumentsList
          documents={documentItems}
          renderActions={(doc) => (
            <div className="flex items-center gap-2">
              <DriverDocumentDialog
                driverId={driver.id}
                document={doc}
                trigger={
                  <Button variant="outline" size="sm">
                    Modifier
                  </Button>
                }
              />
              <DocumentDeleteButton
                docName={doc.doc_name}
                onDelete={deleteDriverDocument.bind(null, doc.id)}
              />
            </div>
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">Historique des tournées</h2>
        {!entries || entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-muted">
            Aucune tournée enregistrée pour le moment.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tournée</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const sector = resolveEntrySector(entry, sectorsById);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="tabular-nums">{formatDate(entry.entry_date)}</TableCell>
                        <TableCell className="font-medium tabular-nums">{sector?.code ?? "—"}</TableCell>
                        <TableCell>{statusBadge(entry)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-1.5 md:hidden">
              {entries.map((entry) => {
                const sector = resolveEntrySector(entry, sectorsById);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="tabular-nums text-foreground">{formatDate(entry.entry_date)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-foreground">{sector?.code ?? "—"}</span>
                      {statusBadge(entry)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
