import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
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
  themeColor: "#F7F8FA",
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
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" theme="light" richColors={false} />
      </body>
    </html>
  );
}
