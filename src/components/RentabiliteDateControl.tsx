"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
