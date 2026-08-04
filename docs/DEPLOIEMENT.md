# Mise en ligne

## Premier déploiement

1. Poussez le code sur GitHub (voir README).
2. Sur [vercel.com](https://vercel.com) : **Add New → Project**, choisissez le dépôt.
3. Avant de cliquer sur *Deploy*, ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déployez. Comptez deux minutes.

## Brancher votre domaine

Dans Vercel : **Settings → Domains → Add**, saisissez `monpetitpotager.com`.

Vercel affiche les enregistrements DNS à créer chez votre registrar :

| Type  | Nom | Valeur |
|-------|-----|--------|
| A     | @   | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

La propagation prend de quelques minutes à 48 heures. Le certificat HTTPS est
généré automatiquement, vous n'avez rien à faire.

## Configurer les e-mails Supabase

Dans Supabase : **Authentication → URL Configuration**

- *Site URL* : `https://monpetitpotager.com`
- *Redirect URLs* : ajoutez `https://monpetitpotager.com/auth/callback`

Sans cela, les liens de confirmation renverront vers `localhost` et vos
utilisateurs ne pourront pas activer leur compte.

Le service d'envoi intégré de Supabase est limité à quelques dizaines d'e-mails
par heure — suffisant pour tester, pas pour ouvrir au public. Branchez ensuite
un vrai expéditeur (Resend, Postmark, Brevo) dans **Authentication → SMTP**.

## Sauvegardes

Le plan gratuit de Supabase conserve 7 jours de sauvegardes. Dès que vous avez
de vrais utilisateurs, passez au plan payant et vérifiez que la restauration
fonctionne : une sauvegarde jamais testée n'est pas une sauvegarde.

## Surveillance

- Vercel : onglet *Logs* pour les erreurs serveur
- Supabase : *Logs & Reports* pour les requêtes lentes et les erreurs SQL
- Ajoutez [Sentry](https://sentry.io) dès l'ouverture au public : vous saurez
  qu'une page plante avant qu'un utilisateur ne vous écrive.

## Coûts à prévoir

| Service  | Gratuit jusqu'à | Ensuite |
|----------|-----------------|---------|
| Vercel   | usage personnel | 20 $/mois |
| Supabase | 500 Mo, 50 000 utilisateurs actifs | 25 $/mois |
| Domaine  | — | 10 à 15 €/an |

Comptez donc zéro au démarrage, et autour de 50 €/mois une fois le service
réellement utilisé.
