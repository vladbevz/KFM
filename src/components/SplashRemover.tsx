"use client";

import { useEffect } from "react";

// Le splash lui-même (#app-splash) est du HTML/CSS pur rendu par le Server
// Component racine (layout.tsx) — visible dès le tout premier paint, avant
// toute exécution JS. Ce composant n'affiche rien : il se contente de faire
// disparaître le splash une fois React hydraté (fondu court, puis retrait
// du DOM), sans jamais conditionner l'affichage initial du splash lui-même.
export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;
    el.classList.add("app-splash--hidden");
    const timer = setTimeout(() => el.remove(), 220);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
