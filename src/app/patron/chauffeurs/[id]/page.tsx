import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/DetailHeader";
import { DriverActiveToggle } from "@/components/DriverActiveToggle";
import { DriverDocumentDialog } from "@/components/DriverDocumentDialog";
import { DocumentsList, type DocumentItem } from "@/components/DocumentsList";
import type { Database } from "@/types/database";

type DriverDocument = Database["public"]["Tables"]["driver_documents"]["Row"];

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: driver }, { data: documents }] = await Promise.all([
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
  ]);

  if (!driver || driver.role !== "driver") notFound();

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DetailHeader title={driver.full_name} />
          <Badge variant={driver.active ? "success" : "secondary"}>
            {driver.active ? "Actif" : "Désactivé"}
          </Badge>
        </div>
        <DriverActiveToggle driverId={driver.id} active={driver.active} />
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
            <DriverDocumentDialog
              driverId={driver.id}
              document={doc}
              trigger={
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
              }
            />
          )}
        />
      </div>
    </div>
  );
}
