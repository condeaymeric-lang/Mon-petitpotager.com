# Brancher les paiements (Stripe Connect)

C'est la brique la plus délicate du projet. Elle touche à la réglementation
financière, pas seulement à la technique. Prenez le temps de la faire correctement.

## Pourquoi Stripe Connect et pas Stripe tout court

Vous n'encaissez pas pour vous : vous encaissez **pour le compte de vos vendeurs**.
C'est juridiquement une activité d'intermédiation de paiement, normalement réservée
aux établissements agréés. Stripe Connect (ou Mangopay, ou Lemonway) porte cet
agrément à votre place. Sans cela, vous êtes en infraction dès le premier euro.

Ne codez jamais vous-même la conservation de fonds, même temporairement.

## Ce que Stripe Connect prend en charge

- L'encaissement auprès de l'acheteur
- La vérification d'identité des vendeurs (KYC), obligatoire au-delà de certains seuils
- Le séquestre des fonds jusqu'à la confirmation de retrait
- Le versement aux vendeurs, avec votre commission prélevée automatiquement
- La déclaration DAC7 des revenus des vendeurs à l'administration fiscale

## Étapes

### 1. Créer le compte

Sur [stripe.com](https://stripe.com), activez **Connect** en mode *Express* :
c'est Stripe qui héberge le formulaire d'inscription des vendeurs, vous n'avez
pas à collecter leurs pièces d'identité vous-même.

### 2. Ajouter les clés

Dans `.env.local` puis dans les variables Vercel :

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Seule la clé `NEXT_PUBLIC_` peut apparaître côté navigateur. Les deux autres
restent strictement côté serveur.

### 3. Inscrire les vendeurs

Chaque vendeur doit avoir un compte Stripe connecté avant de pouvoir être payé.
Créez une route `app/api/stripe/onboarding/route.ts` qui appelle
`stripe.accounts.create({ type: 'express', country: 'FR' })`, enregistre l'identifiant
dans `profils.stripe_account_id`, puis redirige vers le lien d'inscription Stripe.

Tant que `stripe_account_id` est vide, le vendeur ne peut publier qu'en mode
troc ou don. C'est une contrainte à faire respecter côté serveur, pas seulement
dans l'interface.

### 4. Encaisser

À la validation du panier, créez un *PaymentIntent* avec `transfer_group` égal à
la référence de commande. Les fonds arrivent sur votre compte Stripe et n'en
bougent pas encore.

### 5. Verser après retrait

C'est le cœur de votre promesse : *le vendeur n'est payé qu'après confirmation
de retrait par l'acheteur*. Quand la commande passe au statut `retiree`,
déclenchez un `stripe.transfers.create()` par vendeur, du montant de ses lignes
moins votre commission.

Faites cela dans un **webhook**, jamais depuis le navigateur : un utilisateur
malveillant pourrait sinon déclencher des virements.

### 6. Gérer les litiges

Prévoyez un statut `litige` qui bloque le versement, un délai de traitement écrit
dans vos CGV, et une procédure de remboursement (`stripe.refunds.create()`).

## Coûts

Stripe prend environ 1,5 % + 0,25 € par transaction européenne, plus 0,25 % sur
les transferts Connect. Sur un panier à 12 €, cela représente près de 0,50 € :
soit presque autant que votre commission à 5 %.

C'est la raison pour laquelle le modèle repose davantage sur les frais de service
fixes, les abonnements et les financements publics que sur la commission. Voir
le document de modèle économique.

## Ordre conseillé

N'activez pas les paiements dès le lancement. Faites d'abord fonctionner un
secteur avec des règlements en main propre. Vous saurez alors si les gens
échangent réellement — et vous éviterez de porter des obligations réglementaires
lourdes pour un service que personne n'utilise encore.
