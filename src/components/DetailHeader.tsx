"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function DetailHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Retour"
        className="rounded-md p-1.5 text-foreground/70 hover:bg-surface"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </div>
  );
}
