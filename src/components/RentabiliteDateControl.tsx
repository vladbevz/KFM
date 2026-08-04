"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Reste entièrement en UTC (Date.UTC + setUTCDate) : passer par l'heure
// locale puis reformater en UTC via toISOString() fait perdre ou gagner un
// jour selon le sens dès que le fuseau local a un offset positif (ex.
// Europe/Paris, été comme hiver) — bug corrigé ici, cf. Correction 2.
function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function RentabiliteDateControl({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(next: string) {
    router.push(`${pathname}?date=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => goTo(shiftDate(date, -1))}>
        ← Veille
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="w-auto"
      />
      <Button variant="outline" size="sm" onClick={() => goTo(shiftDate(date, 1))}>
        Lendemain →
      </Button>
    </div>
  );
}
