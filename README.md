# KFM Suivi

PWA de suivi quotidien pour les chauffeurs de KFM Transport. Deux espaces :
**Chauffeur** (saisie du rapport journalier) et **Patron** (statistiques et
tableau comparatif de tous les chauffeurs).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Auth, Row Level Security)
- Recharts
- PWA (manifest + service worker)

## Développement local

```bash
npm install
cp .env.local.example .env.local   # puis renseigner les valeurs Supabase
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

### Base de données

Le schéma complet (tables, RLS, trigger de création de profil) est dans
[`supabase/schema.sql`](supabase/schema.sql) — à exécuter une fois dans le
SQL Editor d'un nouveau projet Supabase. Les évolutions incrémentales sont
dans [`supabase/migrations/`](supabase/migrations/), déjà appliquées sur le
projet en cours.

Le rôle de chaque utilisateur (`driver` ou `boss`) se change manuellement
dans Table Editor → `profiles` — il n'y a pas d'interface pour ça côté
client (le rôle ne peut pas être modifié via l'API, voir migration 003).

## Déploiement sur Vercel

1. Pousser ce dépôt sur GitHub (déjà configuré : `origin` →
   `github.com/vladbevz/KFM`).
2. Sur [vercel.com/new](https://vercel.com/new), importer le dépôt — Vercel
   détecte Next.js automatiquement, aucune configuration de build requise.
3. Renseigner les mêmes variables d'environnement que ci-dessus dans
   Project Settings → Environment Variables (Production **et** Preview).
4. Déployer. Les déploiements suivants se font automatiquement à chaque push
   sur `main`.

Le middleware (protection des routes `/chauffeur` et `/patron`) tourne sur
l'Edge Runtime de Vercel, aucun réglage particulier n'est nécessaire.
