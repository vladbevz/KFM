"use client";

import dynamic from "next/dynamic";

// Wrapper client dédié : next/dynamic avec ssr:false est interdit directement
// dans un Server Component (chauffeur/statistiques/page.tsx), mais autorisé
// ici puisque ce fichier est lui-même "use client" — c'est ce qui permet à
// recharts (~120 Ko) de ne charger qu'après l'affichage initial de la page,
// au lieu de faire partie du JS critique de hydratation.
export const StatsChartLazy = dynamic(
  () => import("@/components/StatsChart").then((m) => m.StatsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-surface" />
    ),
  },
);
