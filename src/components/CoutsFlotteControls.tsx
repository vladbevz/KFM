"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PeriodSelector } from "@/components/PeriodSelector";
import type { PeriodKey } from "@/lib/stats";

export function CoutsFlotteControls({
  period,
  customFrom,
  customTo,
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <PeriodSelector period={period} customFrom={customFrom} customTo={customTo} updateParams={updateParams} />
  );
}
