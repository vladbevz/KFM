import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "foreground-muted": "#6B7280",
        surface: "#FFFFFF",
        // Fond des navs flottantes (bottom nav chauffeur, navbar patron) :
        // reste sombre en permanence, y compris en thème clair, pour l'effet
        // "flottant" à fort contraste — ne bascule jamais avec le thème.
        "nav-surface": "#14171A",
        "nav-foreground-muted": "#7B8496",
        km: "#E8A23B",
        "accent-ink": "#1A1204",
        deliveries: "#2F6FED",
        enlevements: "#1FA463",
        // Palette shadcn/ui — mêmes valeurs que ci-dessus, reconverties en
        // HSL dans globals.css pour supporter les modificateurs d'opacité
        // (bg-primary/10 etc). `border` migre du hex littéral vers cette
        // variable : couleur identique, juste unifiée avec les composants
        // shadcn qui l'attendent sous ce nom.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.3)",
        float: "0 8px 24px rgba(0,0,0,.4)",
        accent: "0 8px 20px rgba(232,162,59,.25)",
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
