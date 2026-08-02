"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export function AppHeader({
  fullName,
  role,
}: {
  fullName: string;
  role: "Chauffeur" | "Patron";
}) {
  const [open, setOpen] = useState(false);
  const firstName = fullName.split(" ")[0] || "?";
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <header className="relative flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      <p className="text-sm font-medium text-foreground">{role}</p>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {initial}
        </span>
        <span className="text-sm font-medium text-foreground">{firstName}</span>
      </button>

      {open && (
        <>
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-4 top-full z-20 mt-2 w-44 rounded-md border border-border bg-surface p-1 shadow-card">
            <LogoutButton />
          </div>
        </>
      )}
    </header>
  );
}
