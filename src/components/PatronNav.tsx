"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Truck,
  Users,
  Fuel,
  Calendar,
  type LucideIcon,
} from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/patron", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/patron/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/patron/rentabilite", label: "Rentabilité", icon: TrendingUp },
  { href: "/patron/vehicules", label: "Camions", icon: Truck },
  { href: "/patron/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/patron/carburant", label: "Carburant", icon: Fuel },
  { href: "/patron/calendrier", label: "Calendrier", icon: Calendar },
];

export function PatronNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border bg-surface px-4 py-2">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              active ? "bg-km/10 text-km" : "text-foreground/60"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
