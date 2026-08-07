"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export function AccountMenuButton({
  fullName,
  showName = true,
  menuSide = "bottom",
  size = "default",
  floating = false,
}: {
  fullName: string;
  showName?: boolean;
  menuSide?: "top" | "bottom";
  // "lg" réservé au nav chauffeur (cible tactile plus généreuse) ; le nav
  // patron ne passe pas cette prop et garde le rendu "default" inchangé.
  size?: "default" | "lg";
  // Contour + ombre, pour un avatar posé directement sur le fond de page
  // (ex. bouton compte flottant en haut côté chauffeur) plutôt que sur le
  // fond sombre d'une pilule de nav où le contraste est déjà suffisant.
  floating?: boolean;
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
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full ${size === "lg" ? "py-1.5 pl-1.5 pr-2.5" : "py-1 pl-1 pr-2"}`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-foreground ${
            size === "lg" ? "h-12 w-12 text-base" : "h-8 w-8 text-sm"
          } ${floating ? "border border-border shadow-card" : ""}`}
        >
          {initial}
        </span>
        {showName && (
          <span className="text-sm font-medium text-nav-foreground-muted">{firstName}</span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            className={`absolute right-0 z-20 w-44 rounded-md border border-border bg-surface p-1 shadow-card ${
              menuSide === "top" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
}
