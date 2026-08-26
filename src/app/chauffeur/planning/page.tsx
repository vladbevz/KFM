import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { ChauffeurPlanningCalendar } from "@/components/ChauffeurPlanningCalendar";
import { CongeRequestForm } from "@/components/CongeRequestForm";
import { CongeRequestsList } from "@/components/CongeRequestsList";
import { datesInRange } from "@/lib/schedule";
import type { Database } from "@/types/database";

type CongeRequest = Database["public"]["Tables"]["conge_requests"]["Row"];

function firstOfMonth(monthISO: string): string {
  return `${monthISO}-01`;
}

function lastOfMonth(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${monthISO}-${String(lastDay).padStart(2, "0")}`;
}

export default async function ChauffeurPlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const todayISO = new Date().toISOString().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : todayISO.slice(0, 7);
  const monthFrom = firstOfMonth(month);
  const monthTo = lastOfMonth(month);

  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: myRequests }, { data: otherDates }] = await Promise.all([
    supabase
      .from("conge_requests")
      .select("*")
      .eq("driver_id", user!.id)
      .order("created_at", { ascending: false })
      .returns<CongeRequest[]>(),
    // Fonction security definer : ne renvoie que des dates, jamais
    // l'identité du chauffeur concerné (cf. contrainte RLS explicite).
    supabase
      .rpc("conge_dates_other_drivers", { from_date: monthFrom, to_date: monthTo })
      .returns<{ conge_date: string }[]>(),
  ]);

  // Mes propres jours de congé approuvés du mois affiché, dérivés de mes
  // demandes (pas besoin de relire schedule séparément — l'approbation crée
  // exactement ces dates-là).
  const ownCongeDates = new Set<string>();
  for (const req of myRequests ?? []) {
    if (req.status !== "approved") continue;
    for (const d of datesInRange(req.start_date, req.end_date)) {
      if (d >= monthFrom && d <= monthTo) ownCongeDates.add(d);
    }
  }

  const otherCongeDates = new Set((otherDates ?? []).map((r) => r.conge_date));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Mon planning</h1>

      <ChauffeurPlanningCalendar
        month={month}
        todayISO={todayISO}
        ownCongeDates={[...ownCongeDates]}
        otherCongeDates={[...otherCongeDates]}
      />

      <CongeRequestForm />

      <CongeRequestsList requests={myRequests ?? []} />
    </div>
  );
}
