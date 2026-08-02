import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/DetailHeader";
import { VehicleStatusBadge } from "@/components/VehicleStatusBadge";
import { VehicleStatusControl } from "@/components/VehicleStatusControl";
import { VehicleDocumentDialog } from "@/components/VehicleDocumentDialog";
import { DocumentsList, type DocumentItem } from "@/components/DocumentsList";
import { resolveVehicleIssue } from "@/app/patron/vehicules/actions";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleIssue = Database["public"]["Tables"]["vehicle_issues"]["Row"];
type VehicleDocument = Database["public"]["Tables"]["vehicle_documents"]["Row"];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: issues }, { data: documents }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle<Vehicle>(),
    supabase
      .from("vehicle_issues")
      .select("*")
      .eq("vehicle_id", id)
      .order("reported_at", { ascending: false })
      .returns<VehicleIssue[]>(),
    supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .returns<VehicleDocument[]>(),
  ]);

  if (!vehicle) notFound();

  const reporterIds = [...new Set((issues ?? []).map((i) => i.reported_by).filter(Boolean))] as string[];
  const { data: reporters } = reporterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reporterIds)
        .returns<{ id: string; full_name: string }[]>()
    : { data: [] as { id: string; full_name: string }[] };
  const reporterNameById = new Map((reporters ?? []).map((r) => [r.id, r.full_name]));

  const photoUrlByIssueId = new Map<string, string>();
  for (const issue of issues ?? []) {
    if (!issue.photo_url) continue;
    const { data: signed } = await supabase.storage
      .from("vehicle-issues")
      .createSignedUrl(issue.photo_url, 3600);
    if (signed) photoUrlByIssueId.set(issue.id, signed.signedUrl);
  }

  const documentItems: DocumentItem[] = [];
  for (const doc of documents ?? []) {
    const { data: signed } = await supabase.storage
      .from("vehicle-documents")
      .createSignedUrl(doc.file_url, 3600);
    documentItems.push({
      id: doc.id,
      doc_name: doc.doc_name,
      expiry_date: doc.expiry_date,
      signedUrl: signed?.signedUrl,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DetailHeader title={vehicle.plate} />
          <VehicleStatusBadge status={vehicle.status} />
        </div>
        {vehicle.label && <p className="pl-9 text-sm text-foreground/60">{vehicle.label}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-foreground/70">Changer le statut</p>
        <VehicleStatusControl vehicleId={vehicle.id} status={vehicle.status} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">Documents</h2>
          <VehicleDocumentDialog
            vehicleId={vehicle.id}
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
            <VehicleDocumentDialog
              vehicleId={vehicle.id}
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

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">Historique des signalements</h2>

        {!issues || issues.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            Aucun signalement pour ce véhicule.
          </p>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {formatDateTime(issue.reported_at)}
                  {issue.reported_by && (
                    <span className="text-foreground/50">
                      {" "}
                      · {reporterNameById.get(issue.reported_by) ?? "Chauffeur"}
                    </span>
                  )}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    issue.status === "resolved"
                      ? "bg-enlevements/15 text-enlevements"
                      : "bg-km/15 text-km"
                  }`}
                >
                  {issue.status === "resolved" ? "Résolu" : "En cours"}
                </span>
              </div>

              {issue.description && (
                <p className="text-sm text-foreground/70">{issue.description}</p>
              )}

              {issue.photo_url && (
                photoUrlByIssueId.has(issue.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrlByIssueId.get(issue.id)}
                    alt="Photo du signalement"
                    className="h-48 w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <p className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-foreground/50">
                    Photo indisponible
                  </p>
                )
              )}

              {issue.status === "open" && (
                <form
                  action={async () => {
                    "use server";
                    await resolveVehicleIssue(issue.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70"
                  >
                    Marquer résolu
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
