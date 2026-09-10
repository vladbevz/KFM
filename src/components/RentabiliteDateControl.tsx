"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Jour précédent"
        onClick={() => goTo(shiftDate(date, -1))}
        className="h-9 w-9 p-0"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="w-auto"
      />
      <Button
        variant="ghost"
        size="sm"
        aria-label="Jour suivant"
        onClick={() => goTo(shiftDate(date, 1))}
        className="h-9 w-9 p-0"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </Button>
    </div>
  );
}
