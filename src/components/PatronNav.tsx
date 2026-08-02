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
import { AccountMenuButton } from "@/components/AccountMenuButton";

const TABS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/patron", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/patron/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/patron/rentabilite", label: "Rentabilité", icon: TrendingUp },
  { href: "/patron/vehicules", label: "Camions", icon: Truck },
  { href: "/patron/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/patron/carburant", label: "Carburant", icon: Fuel },
  { href: "/patron/calendrier", label: "Calendrier", icon: Calendar },
];

export function PatronNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();

  return (
    <nav className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-full bg-nav-surface px-2 py-2 shadow-float">
      <div className="flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-km text-accent-ink" : "text-nav-foreground-muted"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <AccountMenuButton fullName={fullName} />
    </nav>
  );
}
