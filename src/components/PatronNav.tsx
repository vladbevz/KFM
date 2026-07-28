"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/patron", label: "Statistiques" },
  { href: "/patron/rentabilite", label: "Rentabilité" },
  { href: "/patron/vehicules", label: "Véhicules" },
  { href: "/patron/secteurs", label: "Secteurs" },
];

export function PatronNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 border-b border-border bg-surface px-4 py-2">
      {TABS.map((tab) => {
        const active =
          tab.href === "/patron" ? pathname === "/patron" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm ${
              active ? "bg-km/10 text-km" : "text-foreground/60"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
