# monpetitpotager.com

Marketplace locale entre jardiniers, producteurs et habitants.
Couverture nationale, expérience limitée au secteur : chacun ne voit que les 20 km autour de chez lui.

Next.js 14 · Supabase (PostgreSQL + PostGIS) · Leaflet · TypeScript

---

## Mise en route

Compter environ 30 minutes la première fois. Aucune connaissance en développement n'est
indispensable pour les étapes 1 à 5, mais il faut être méthodique.

### 1. Installer les outils

- [Node.js](https://nodejs.org) version 18 ou supérieure
- Un compte [GitHub](https://github.com) (gratuit)
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)

### 2. Créer la base de données

1. Sur Supabase, cliquez sur **New project**.
2. Choisissez la région **Europe (Paris)** — les données de vos utilisateurs
   restent ainsi dans l'Union européenne, ce qui simplifie le RGPD.
3. Notez le mot de passe de la base : il ne sera plus affiché.
4. Une fois le projet prêt, ouvrez **SQL Editor**.
5. Copiez tout le contenu de `supabase/schema.sql`, collez-le, cliquez sur **Run**.
6. Faites de même avec `supabase/seed.sql` (le catalogue des produits et variétés).

Si une erreur mentionne l'extension `postgis`, activez-la d'abord :
**Database → Extensions → postgis → Enable**, puis relancez le script.

### 3. Récupérer vos clés

Dans Supabase : **Settings → API**. Deux valeurs vous intéressent :

- **Project URL** — commence par `https://`
- **anon public** — une longue chaîne commençant par `eyJ`

La clé `service_role` figure sur la même page. Elle contourne toutes les règles de
sécurité : ne la mettez jamais dans le code du site, ni sur GitHub. Elle ne sert
qu'au script d'import, depuis votre machine.

### 4. Lancer le site en local

```bash
npm install
cp .env.local.example .env.local
# ouvrez .env.local et collez vos deux valeurs
npm run dev
```

Ouvrez http://localhost:3000.

### 5. Importer les communes de France

Le fichier `seed.sql` ne contient que quatre communes. Pour les 34 800 :

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
node scripts/import-communes.mjs
```

Compter 2 à 4 minutes. Les données viennent de l'API Géo de l'État.

### 6. Mettre en ligne

```bash
git init
git add .
git commit -m "Première version"
git remote add origin https://github.com/VOTRE-COMPTE/monpetitpotager.git
git push -u origin main
```

Puis sur Vercel : **Add New → Project**, sélectionnez le dépôt, et ajoutez les
deux variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) avant de déployer.

Pour brancher votre nom de domaine : **Settings → Domains**, ajoutez
`monpetitpotager.com`, puis suivez les instructions DNS chez votre registrar.

---

## Ce qui fonctionne

- Inscription en trois étapes avec choix de la commune (région/département ou code postal)
- Carte réelle du secteur avec cercle de 20 km et communes voisines calculées à la vraie distance
- Ouverture d'un secteur au seuil de 200 voisins, avec liste d'attente et jauge
- Fil d'annonces filtré par distance réelle (PostGIS), par catégorie et par saison
- Publication en trois écrans : produit, variété, fiche — avec photos envoyées depuis le téléphone
- Comparaison automatique avec le prix moyen en grande surface
- Panier multi-vendeurs, points de fidélité, frais de service
- Commandes avec suivi en quatre étapes et versement au vendeur après confirmation de retrait
- Bascule acheteur / vendeur avec deux navigations distinctes

## Ce qui reste à faire

**Le paiement en ligne.** Aujourd'hui la commande est enregistrée mais rien n'est
encaissé : les gens règlent sur place. Pour encaisser, il faut Stripe Connect —
c'est la brique la plus délicate, elle touche à la réglementation. Voir
`docs/PAIEMENTS.md`.

**Les notifications.** Ni e-mail ni push pour l'instant. Resend ou Postmark côté
e-mail, une fois qu'il y aura de vrais utilisateurs.

**Les applications mobiles.** Le site est utilisable sur téléphone. Les applications
natives (React Native / Expo) ne se justifient qu'une fois les usages installés.

**La modération.** Signalement d'annonces, règles écrites, délais de traitement.
Indispensable dès que le nombre de secteurs grandit.

---

## Avant d'ouvrir au public

Ces points ne sont pas techniques mais ils conditionnent la légalité du service :

- Société créée et assurance responsabilité civile professionnelle
- CGU, CGV, politique de confidentialité et mentions légales
- Registre RGPD, procédure d'effacement des comptes
- Intermédiation de paiement via un prestataire agréé (jamais en direct)
- Déclaration DAC7 des revenus des vendeurs à l'administration
- Vérification d'identité des vendeurs au-delà des seuils
- Règles d'hygiène et de traçabilité pour les produits alimentaires

Faites valider ce cadre par un avocat spécialisé et un expert-comptable avant
d'encaisser le premier euro. Une journée de conseil coûte moins cher qu'un litige.

---

## Organisation du code

```
app/                    pages (routage par dossier)
  page.tsx              accueil, fil d'annonces
  inscription/          création de compte en 3 étapes
  annonce/[id]/         fiche d'une annonce
  panier/               panier et validation
  commandes/            liste et suivi
  vendre/               espace vendeur, publication
  profil/               compte, secteur, points
components/             composants réutilisables
lib/                    clients Supabase, types, utilitaires
supabase/               schema.sql et seed.sql
scripts/                import des communes
```

`middleware.ts` protège les pages privées et rafraîchit la session à chaque requête.

La sécurité repose sur le Row Level Security de PostgreSQL : les règles sont
définies dans `schema.sql`. Ne les désactivez jamais — sans elles, n'importe qui
pourrait lire ou modifier les données de n'importe qui, y compris depuis le
navigateur.
