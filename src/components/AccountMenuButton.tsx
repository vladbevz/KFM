"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

export function AccountMenuButton({
  fullName,
  showName = true,
  menuSide = "bottom",
  size = "default",
  floating = false,
  notificationsHref,
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
  // Lien "Notifications" optionnel dans le menu — le module ne cible que le
  // patron pour l'instant (cf. demande explicite), donc seul PatronNav passe
  // cette prop ; ChauffeurAccountButton ne l'affiche jamais.
  notificationsHref?: string;
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
            {notificationsHref && (
              <Link
                href={notificationsHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <Bell className="h-4 w-4" strokeWidth={1.8} />
                Notifications
              </Link>
            )}
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
}
