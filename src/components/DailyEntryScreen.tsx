"use client";

import { useState } from "react";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { EntryCard } from "@/components/EntryCard";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export function DailyEntryScreen({
  existingEntry,
}: {
  existingEntry: DailyEntry | null;
}) {
  const [entry, setEntry] = useState(existingEntry);
  const [mode, setMode] = useState<"summary" | "form">(
    existingEntry ? "summary" : "form",
  );

  if (mode === "summary" && entry) {
    return (
      <EntryCard entry={entry}>
        <button
          onClick={() => setMode("form")}
          className="mt-1 rounded-md bg-km px-4 py-2 text-sm font-medium text-black"
        >
          Modifier le rapport
        </button>
      </EntryCard>
    );
  }

  return (
    <DailyEntryForm
      existingEntry={entry}
      onCancel={entry ? () => setMode("summary") : undefined}
      onSaved={(saved) => {
        setEntry(saved);
        setMode("summary");
      }}
    />
  );
}
