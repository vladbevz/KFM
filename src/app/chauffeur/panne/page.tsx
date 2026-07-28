import { createClient } from "@/lib/supabase/server";
import { ReportIssueForm } from "@/components/ReportIssueForm";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export default async function PannePage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .order("plate")
    .returns<Vehicle[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Signaler une panne</h1>
      <ReportIssueForm vehicles={vehicles ?? []} />
    </div>
  );
}
