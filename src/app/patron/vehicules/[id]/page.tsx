import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailHeader } from "@/components/DetailHeader";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { VehicleStatusBadge } from "@/components/VehicleStatusBadge";
import { VehicleStatusControl } from "@/components/VehicleStatusControl";
import { VehicleDocumentDialog } from "@/components/VehicleDocumentDialog";
import { VehicleRepairDialog } from "@/components/VehicleRepairDialog";
import { VehicleRetireToggle } from "@/components/VehicleRetireToggle";
import { VehicleDeleteForeverDialog } from "@/components/VehicleDeleteForeverDialog";
import { DocumentsList, type DocumentItem } from "@/components/DocumentsList";
import { resolveVehicleIssue } from "@/app/patron/vehicules/actions";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleIssue = Database["public"]["Tables"]["vehicle_issues"]["Row"];
type VehicleDocument = Database["public"]["Tables"]["vehicle_documents"]["Row"];
type VehicleRepair = Database["public"]["Tables"]["vehicle_repairs"]["Row"];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`));
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cost);
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: issues }, { data: documents }, { data: repairs }] = await Promise.all([
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
    supabase
      .from("vehicle_repairs")
      .select("*")
      .eq("vehicle_id", id)
      .order("repaired_at", { ascending: false })
      .returns<VehicleRepair[]>(),
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

  const invoiceUrlByRepairId = new Map<string, string>();
  for (const repair of repairs ?? []) {
    if (!repair.invoice_url) continue;
    const { data: signed } = await supabase.storage
      .from("vehicle-repairs")
      .createSignedUrl(repair.invoice_url, 3600);
    if (signed) invoiceUrlByRepairId.set(repair.id, signed.signedUrl);
  }

  const totalRepairsCost = (repairs ?? []).reduce((sum, r) => sum + Number(r.cost), 0);
  const openIssues = (issues ?? [])
    .filter((i) => i.status === "open")
    .map((i) => ({ id: i.id, description: i.description, reported_at: i.reported_at }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DetailHeader title={vehicle.plate} />
          <div className="flex items-center gap-2">
            {vehicle.retired && <Badge variant="secondary">Retiré de la flotte</Badge>}
            <VehicleStatusBadge status={vehicle.status} />
          </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">
            Réparations — {formatCost(totalRepairsCost)} au total
          </h2>
          <VehicleRepairDialog
            vehicleId={vehicle.id}
            openIssues={openIssues}
            trigger={
              <Button variant="outline" size="sm">
                Ajouter une réparation
              </Button>
            }
          />
        </div>

        {!repairs || repairs.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/50">
            Aucune réparation enregistrée.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {repairs.map((repair) => (
              <div
                key={repair.id}
                className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{formatDate(repair.repaired_at)}</p>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCost(Number(repair.cost))}
                  </span>
                </div>
                <p className="text-sm text-foreground/70">{repair.description}</p>
                {invoiceUrlByRepairId.has(repair.id) && (
                  <a
                    href={invoiceUrlByRepairId.get(repair.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-foreground underline"
                  >
                    Voir la facture
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
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
                <Badge variant={issue.status === "resolved" ? "success" : "warning"}>
                  {issue.status === "resolved" ? "Résolu" : "En cours"}
                </Badge>
              </div>

              {issue.description && (
                <p className="text-sm text-foreground/70">{issue.description}</p>
              )}

              {issue.photo_url && (
                photoUrlByIssueId.has(issue.id) ? (
                  <PhotoLightbox
                    src={photoUrlByIssueId.get(issue.id)!}
                    alt="Photo du signalement"
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

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="text-sm font-semibold text-foreground/80">Gestion du véhicule</h2>
        <div className="flex flex-wrap gap-2">
          <VehicleRetireToggle vehicleId={vehicle.id} retired={vehicle.retired} />
          <VehicleDeleteForeverDialog vehicleId={vehicle.id} plate={vehicle.plate} />
        </div>
      </div>
    </div>
  );
}
