# Prompt de création — KFM Suivi

Copie tout ce qui suit dans Claude Code (ou un autre outil de génération de code) pour démarrer le projet.

---

## Contexte du projet

Crée une application web (PWA) appelée **KFM Suivi**, destinée au suivi quotidien de 15 à 20 chauffeurs pour une entreprise de transport/livraison. L'application a deux rôles :

- **Chauffeur** : saisit ses données une fois par jour, en fin de journée, et consulte ses propres statistiques.
- **Patron** : consulte les statistiques de tous les chauffeurs, individuellement ou de manière cumulée, avec graphiques et tableau comparatif triable.

## Stack technique

- **Next.js 14** (App Router) + React + TypeScript
- **Tailwind CSS** pour le style
- **Supabase** pour la base de données (PostgreSQL), l'authentification, et les Row Level Security policies
- **Recharts** pour les graphiques
- Configuration **PWA** (manifest.json + service worker) pour une installation sur écran d'accueil mobile, sans passage par l'App Store / Play Store
- Déploiement prévu sur **Vercel**

## Modèle de données (Supabase)

Table `profiles` (liée à `auth.users`) :
- `id` (uuid, référence auth.users)
- `full_name` (text)
- `role` (`driver` | `boss`)

Table `daily_entries` :
- `id` (uuid, primary key)
- `driver_id` (uuid, référence profiles.id)
- `entry_date` (date)
- `km` (integer) — kilomètres parcourus
- `deliveries` (integer) — nombre de livraisons
- `expenses` (numeric, nullable) — dépenses du jour
- `comment` (text, nullable)
- `created_at` (timestamp)
- Contrainte unique sur (`driver_id`, `entry_date`) pour empêcher une double saisie le même jour

## Row Level Security

- Un chauffeur ne peut lire/écrire que ses propres lignes dans `daily_entries` (`driver_id = auth.uid()`)
- Un utilisateur avec `role = 'boss'` peut lire toutes les lignes de tous les chauffeurs
- Personne ne peut modifier une entrée après un délai de 24h (à discuter, sinon laisser modifiable)

## Écrans à créer

### Authentification
- Page de connexion (email + mot de passe via Supabase Auth)
- Redirection automatique vers l'espace Chauffeur ou Patron selon le rôle

### Espace Chauffeur
1. **Saisie du jour** — formulaire simple (km, livraisons, dépenses, commentaire). Si une entrée existe déjà pour aujourd'hui, afficher "déjà rempli" avec possibilité de modifier plutôt que dupliquer.
2. **Historique** — liste de ses entrées passées, triée par date décroissante
3. **Mes statistiques** — graphique (ligne ou barres selon la période) avec :
   - Sélecteur de période : 7 jours / 30 jours / 3 mois / période personnalisée (deux champs date "du" / "au")
   - Bascule entre métrique "km" et "livraisons"
   - Cartes récapitulatives : total et moyenne par jour sur la période

### Espace Patron
1. **Vue graphique** — identique à celle du chauffeur, avec un sélecteur supplémentaire pour choisir un chauffeur précis ou "tous les chauffeurs (cumulé)"
2. **Vue tableau comparatif** — un tableau avec une ligne par chauffeur (nom, total km, total livraisons, moyenne km/jour, moyenne livraisons/jour) sur la période sélectionnée. Chaque en-tête de colonne numérique est cliquable pour trier par ordre croissant/décroissant (flèche indiquant le sens actif).
3. Bascule simple entre vue graphique et vue tableau

## Design

- Interface sombre, professionnelle, sobre — fond proche de #0b0e15, cartes en #161b26, bordures fines #232a3a
- Accent ambre/orange pour les kilomètres, bleu pour les livraisons
- Menu de navigation clair adapté au mobile (barre en bas ou menu latéral selon le rôle)
- Chiffres en police à chasse fixe (tabular-nums) pour une lecture facile des statistiques
- Responsive mobile-first — c'est l'usage principal (chauffeurs sur le terrain)

## Étapes de livraison souhaitées

1. Initialiser le projet Next.js + Tailwind + Supabase client
2. Créer le schéma de base de données et les policies RLS (fournir le SQL)
3. Construire l'authentification et la répartition des rôles
4. Construire le formulaire de saisie chauffeur
5. Construire les graphiques et le tableau comparatif (réutiliser un composant commun `StatsChart` paramétrable par `driverId` et `période`)
6. Ajouter la configuration PWA (manifest, icônes, service worker)
7. Préparer le déploiement Vercel

Commence par l'étape 1 et demande confirmation avant de passer à la suivante.
