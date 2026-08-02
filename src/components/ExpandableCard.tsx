"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function ExpandableCard({
  header,
  primary,
  detail,
}: {
  header: React.ReactNode;
  primary?: React.ReactNode;
  detail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 p-4 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          {header}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={1.8}
          />
        </div>
        {primary}
      </button>
      {open && <div className="border-t border-border p-4 pt-3">{detail}</div>}
    </div>
  );
}
