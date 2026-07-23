"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chauffeur", label: "Saisie" },
  { href: "/chauffeur/historique", label: "Historique" },
  { href: "/chauffeur/statistiques", label: "Statistiques" },
];

export function ChauffeurNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface">
      {TABS.map((tab) => {
        const active =
          tab.href === "/chauffeur"
            ? pathname === "/chauffeur"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-3 text-center text-sm ${
              active ? "text-km" : "text-foreground/60"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
