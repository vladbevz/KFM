"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installation PWA non critique : on ignore silencieusement si le
      // navigateur ou l'environnement (ex. iframe de dev) le refuse.
    });
  }, []);

  return null;
}
