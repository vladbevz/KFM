"use client";

import { useEffect, useState } from "react";
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
  Menu,
  type LucideIcon,
} from "lucide-react";
import { AccountMenuButton } from "@/components/AccountMenuButton";
import { LogoutButton } from "@/components/LogoutButton";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
  const activeTab = TABS.find(isActive);
  const firstName = fullName.split(" ")[0] || "?";
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  // La navigation change de présentation selon la largeur : pilule
  // horizontale sur desktop (assez de place pour 7 catégories), hamburger +
  // libellé de la catégorie active + drawer latéral sur mobile (7
  // catégories ne tiennent pas sur une ligne sans retomber sur plusieurs).
  return (
    <>
      <nav className="mx-4 mt-3 hidden items-center justify-between gap-2 rounded-full bg-nav-surface px-2 py-2 shadow-float md:flex md:flex-wrap">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = isActive(tab);
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

      <div className="mx-4 mt-3 flex items-center rounded-full bg-nav-surface px-4 py-2.5 shadow-float md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          className="flex items-center gap-2 text-background"
        >
          <Menu className="h-5 w-5" strokeWidth={1.8} />
          <span className="text-sm font-medium">{activeTab?.label ?? ""}</span>
        </button>
      </div>

      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col gap-1 bg-surface p-4 shadow-float transition-transform duration-200 md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                active ? "bg-km text-accent-ink" : "text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              {tab.label}
            </Link>
          );
        })}

        <div className="mt-auto border-t border-border pt-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {initial}
            </span>
            <span className="text-sm font-medium text-foreground">{firstName}</span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
