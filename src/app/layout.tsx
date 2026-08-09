import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SplashRemover } from "@/components/SplashRemover";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "KFM Suivi",
  description: "Suivi quotidien des chauffeurs",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KFM Suivi",
    // Fallback pour iOS < 15.4, qui ne lit pas background_color du manifest
    // pour peindre son écran de démarrage (Safari 15.4+ et Android le font
    // déjà via manifest.json). Une seule image générique fond clair, pas de
    // matrice par modèle d'iPhone.
    startupImage: "/icons/apple-splash.png",
  },
  other: {
    // Chrome/Android utilisent désormais ce tag standard ; Safari ne
    // reconnaît que le "apple-mobile-web-app-capable" ci-dessus (via
    // appleWebApp) — on garde les deux pour couvrir les deux navigateurs.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#E89D2D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Écran de lancement statique — HTML/CSS pur rendu côté serveur,
            visible dès le tout premier paint (avant toute exécution JS),
            retiré par SplashRemover une fois React hydraté. */}
        <div id="app-splash" className="app-splash" aria-hidden="true">
          <div className="app-splash-logo">
            <span className="app-splash-wordmark">KFM</span>
            <svg
              className="app-splash-wheel"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4v16M4.4 7.8l15.2 8.4M4.4 16.2l15.2-8.4" />
            </svg>
          </div>
          <p className="app-splash-title">KFM Suivi</p>
          <p className="app-splash-subtitle">Chargement…</p>
          <div className="app-splash-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
        <SplashRemover />

        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" theme="light" richColors={false} />
      </body>
    </html>
  );
}
