"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, History, BarChart3, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/chauffeur", label: "Saisie", icon: ClipboardList },
  { href: "/chauffeur/historique", label: "Historique", icon: History },
  { href: "/chauffeur/statistiques", label: "Statistiques", icon: BarChart3 },
];

export function ChauffeurNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-10 flex items-center justify-around rounded-full bg-nav-surface px-2 py-2 shadow-float">
      {TABS.map((tab) => {
        const active =
          tab.href === "/chauffeur"
            ? pathname === "/chauffeur"
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 rounded-full transition-colors ${
              active
                ? "bg-km px-4 py-2.5 text-accent-ink"
                : "px-3 py-2.5 text-foreground-muted"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            {active && <span className="text-sm font-medium">{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
