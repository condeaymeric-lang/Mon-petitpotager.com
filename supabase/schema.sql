-- ═══════════════════════════════════════════════════════════════
--  monpetitpotager.com — schéma de base de données
--  À coller dans Supabase → SQL Editor → Run
--  Idempotent : peut être relancé sans casser l'existant.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists postgis;   -- distances géographiques

-- ─────────────────────────────────────────────
-- 1. SECTEURS  (une commune = un secteur)
-- ─────────────────────────────────────────────
create table if not exists secteurs (
  code_insee   text primary key,              -- ex. '38249'
  nom          text not null,
  code_postal  text,
  departement  text not null,
  region       text,
  population   int  default 0,
  lat          double precision not null,
  lon          double precision not null,
  geo          geography(point, 4326)
                 generated always as (st_point(lon, lat)::geography) stored,
  membres      int  default 0 not null,       -- inscrits confirmés
  attente      int  default 0 not null,       -- liste d'attente
  ouvert       boolean default false not null,
  ouvert_le    timestamptz,
  created_at   timestamptz default now()
);
create index if not exists idx_secteurs_geo on secteurs using gist (geo);
create index if not exists idx_secteurs_cp  on secteurs (code_postal);
create index if not exists idx_secteurs_nom on secteurs (nom);

-- ─────────────────────────────────────────────
-- 2. PROFILS  (extension de auth.users)
-- ─────────────────────────────────────────────
do $$ begin
  create type role_user as enum ('acheteur','amateur','pro');
exception when duplicate_object then null; end $$;

create table if not exists profils (
  id           uuid primary key references auth.users(id) on delete cascade,
  prenom       text not null,
  nom          text,
  telephone    text,
  role         role_user default 'amateur' not null,
  secteur      text references secteurs(code_insee),
  rayon_km     int default 20 not null check (rayon_km between 5 and 50),
  points       int default 0 not null check (points >= 0),
  avatar_url   text,
  bio          text,
  -- champs professionnels
  siret        text,
  raison_sociale text,
  pro_verifie  boolean default false not null,
  -- point relais
  est_relais   boolean default false not null,
  relais_adresse text,
  relais_horaires text,
  -- conformité
  stripe_account_id text,
  cgu_acceptees_le  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_profils_secteur on profils (secteur);

-- ─────────────────────────────────────────────
-- 3. CATALOGUE  (produits et variétés de référence)
-- ─────────────────────────────────────────────
create table if not exists produits (
  id           serial primary key,
  cle          text unique not null,          -- 'tomate'
  nom          text not null,                 -- 'Tomate'
  categorie    text not null,                 -- 'Légumes'
  unite        text not null,                 -- 'kg'
  prix_ref     numeric(8,2),                  -- moyenne grande surface
  mois_saison  int[] default '{}',            -- {6,7,8,9}
  illustration text
);

create table if not exists varietes (
  id           serial primary key,
  produit_id   int references produits(id) on delete cascade,
  nom          text not null,                 -- 'Cœur de bœuf'
  description  text,
  illustration text
);
create index if not exists idx_varietes_produit on varietes (produit_id);

-- ─────────────────────────────────────────────
-- 4. ANNONCES
-- ─────────────────────────────────────────────
do $$ begin
  create type mode_transaction as enum ('vente','troc','don');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_annonce as enum ('brouillon','en_ligne','epuise','retire');
exception when duplicate_object then null; end $$;

create table if not exists annonces (
  id           uuid primary key default uuid_generate_v4(),
  vendeur_id   uuid references profils(id) on delete cascade not null,
  secteur      text references secteurs(code_insee) not null,
  produit_id   int  references produits(id),
  variete_id   int  references varietes(id),
  titre        text not null,
  description  text,
  mode         mode_transaction default 'vente' not null,
  prix         numeric(8,2) default 0 not null check (prix >= 0),
  unite        text not null,
  quantite     int  default 1 not null check (quantite >= 0),
  quantite_initiale int default 1 not null,
  commune      text not null,
  lat          double precision,
  lon          double precision,
  geo          geography(point, 4326),
  photos       text[] default '{}',
  tags         text[] default '{}',
  statut       statut_annonce default 'en_ligne' not null,
  vues         int default 0 not null,
  boost_jusqu_a timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_annonces_geo     on annonces using gist (geo);
create index if not exists idx_annonces_secteur on annonces (secteur, statut);
create index if not exists idx_annonces_vendeur on annonces (vendeur_id);
create index if not exists idx_annonces_date    on annonces (created_at desc);

-- remplit geo automatiquement
create or replace function set_annonce_geo() returns trigger as $$
begin
  if new.lat is not null and new.lon is not null then
    new.geo := st_point(new.lon, new.lat)::geography;
  end if;
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_annonce_geo on annonces;
create trigger trg_annonce_geo before insert or update on annonces
  for each row execute function set_annonce_geo();

-- ─────────────────────────────────────────────
-- 5. COMMANDES
-- ─────────────────────────────────────────────
do $$ begin
  create type statut_commande as enum
    ('en_attente_paiement','confirmee','en_preparation','deposee','retiree','annulee','litige');
exception when duplicate_object then null; end $$;

create table if not exists commandes (
  id            uuid primary key default uuid_generate_v4(),
  reference     text unique not null default ('CMD-' || lpad((floor(random()*100000))::text, 5, '0')),
  acheteur_id   uuid references profils(id) on delete set null,
  secteur       text references secteurs(code_insee),
  sous_total    numeric(10,2) not null,
  reduction     numeric(10,2) default 0 not null,
  points_utilises int default 0 not null,
  frais_service numeric(10,2) default 0 not null,
  total         numeric(10,2) not null,
  mode_retrait  text,                          -- 'relais' | 'main_propre'
  relais_id     uuid references profils(id),
  adresse_retrait text,
  statut        statut_commande default 'en_attente_paiement' not null,
  stripe_payment_intent text,
  paye_le       timestamptz,
  retire_le     timestamptz,
  created_at    timestamptz default now()
);
create index if not exists idx_commandes_acheteur on commandes (acheteur_id, created_at desc);

create table if not exists lignes_commande (
  id           uuid primary key default uuid_generate_v4(),
  commande_id  uuid references commandes(id) on delete cascade not null,
  annonce_id   uuid references annonces(id) on delete set null,
  vendeur_id   uuid references profils(id) on delete set null,
  titre        text not null,                  -- figé au moment de l'achat
  variete      text,
  photo        text,
  prix_unitaire numeric(8,2) not null,
  quantite     int not null check (quantite > 0),
  -- versement au vendeur
  verse        boolean default false not null,
  verse_le     timestamptz
);
create index if not exists idx_lignes_commande on lignes_commande (commande_id);
create index if not exists idx_lignes_vendeur  on lignes_commande (vendeur_id);

-- ─────────────────────────────────────────────
-- 6. POINTS DE FIDÉLITÉ
-- ─────────────────────────────────────────────
create table if not exists mouvements_points (
  id          uuid primary key default uuid_generate_v4(),
  profil_id   uuid references profils(id) on delete cascade not null,
  montant     int not null,                    -- négatif = utilisation
  motif       text not null,
  commande_id uuid references commandes(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists idx_points_profil on mouvements_points (profil_id, created_at desc);

-- crédite/débite et met à jour le solde, de façon atomique
create or replace function ajouter_points(p_profil uuid, p_montant int, p_motif text, p_commande uuid default null)
returns int as $$
declare nouveau_solde int;
begin
  update profils set points = greatest(0, points + p_montant), updated_at = now()
    where id = p_profil returning points into nouveau_solde;
  insert into mouvements_points (profil_id, montant, motif, commande_id)
    values (p_profil, p_montant, p_motif, p_commande);
  return nouveau_solde;
end $$ language plpgsql security definer;

-- ─────────────────────────────────────────────
-- 7. LISTE D'ATTENTE ET OUVERTURE DES SECTEURS
-- ─────────────────────────────────────────────
create table if not exists liste_attente (
  id          uuid primary key default uuid_generate_v4(),
  secteur     text references secteurs(code_insee) on delete cascade not null,
  email       text not null,
  profil_id   uuid references profils(id) on delete set null,
  parraine_par uuid references profils(id) on delete set null,
  notifie     boolean default false not null,
  created_at  timestamptz default now(),
  unique (secteur, email)
);
create index if not exists idx_attente_secteur on liste_attente (secteur);

-- ouvre le secteur dès que le seuil est franchi
create or replace function verifier_ouverture_secteur() returns trigger as $$
declare seuil int := 200; total int;
begin
  select count(*) into total from liste_attente where secteur = new.secteur;
  update secteurs set attente = total where code_insee = new.secteur;
  if total >= seuil then
    update secteurs
      set ouvert = true, ouvert_le = coalesce(ouvert_le, now())
      where code_insee = new.secteur and ouvert = false;
  end if;
  return new;
end $$ language plpgsql security definer;

drop trigger if exists trg_ouverture on liste_attente;
create trigger trg_ouverture after insert on liste_attente
  for each row execute function verifier_ouverture_secteur();

-- ─────────────────────────────────────────────
-- 8. AVIS
-- ─────────────────────────────────────────────
create table if not exists avis (
  id           uuid primary key default uuid_generate_v4(),
  auteur_id    uuid references profils(id) on delete cascade not null,
  vendeur_id   uuid references profils(id) on delete cascade not null,
  commande_id  uuid references commandes(id) on delete cascade,
  note         int not null check (note between 1 and 5),
  commentaire  text,
  created_at   timestamptz default now(),
  unique (auteur_id, commande_id)
);
create index if not exists idx_avis_vendeur on avis (vendeur_id);

-- ═══════════════════════════════════════════════════════════════
--  RECHERCHE D'ANNONCES DANS UN RAYON  (le cœur du produit)
-- ═══════════════════════════════════════════════════════════════
drop function if exists annonces_autour(double precision, double precision, int, text, int);
create or replace function annonces_autour(
  p_lat double precision,
  p_lon double precision,
  p_rayon_km int default 20,
  p_categorie text default null,
  p_limite int default 60
)
returns table (
  id uuid, titre text, description text, mode mode_transaction,
  prix numeric, unite text, quantite int, commune text,
  photos text[], categorie text, produit text, variete text,
  prix_ref numeric, distance_km numeric,
  vendeur_prenom text, vendeur_pro boolean, vendeur_id uuid, vendeur_avatar text,
  illustration text,
  created_at timestamptz
) as $$
  select
    a.id, a.titre, a.description, a.mode,
    a.prix, a.unite, a.quantite, a.commune,
    a.photos, p.categorie, p.nom, v.nom,
    p.prix_ref,
    round((st_distance(a.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    pr.prenom, pr.pro_verifie, pr.id, pr.avatar_url,
    coalesce(v.illustration, p.illustration),
    a.created_at
  from annonces a
  join profils pr on pr.id = a.vendeur_id
  left join produits p on p.id = a.produit_id
  left join varietes v on v.id = a.variete_id
  where a.statut = 'en_ligne'
    and a.quantite > 0
    and st_dwithin(a.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
    and (p_categorie is null or p.categorie = p_categorie)
  order by
    (a.boost_jusqu_a is not null and a.boost_jusqu_a > now()) desc,
    a.created_at desc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  SÉCURITÉ : ROW LEVEL SECURITY
--  Sans ces règles, n'importe qui pourrait lire ou modifier
--  les données de n'importe qui. Ne les désactivez jamais.
-- ═══════════════════════════════════════════════════════════════
alter table profils            enable row level security;
alter table annonces           enable row level security;
alter table commandes          enable row level security;
alter table lignes_commande    enable row level security;
alter table mouvements_points  enable row level security;
alter table liste_attente      enable row level security;
alter table avis               enable row level security;
alter table secteurs           enable row level security;
alter table produits           enable row level security;
alter table varietes           enable row level security;

-- Catalogue et secteurs : lecture publique
drop policy if exists lecture_secteurs on secteurs;
create policy lecture_secteurs on secteurs for select using (true);
-- Un nouvel inscrit peut créer son secteur (commune) s'il n'existe pas encore,
-- mais ne peut pas se faire passer pour un secteur déjà ouvert ou peuplé.
drop policy if exists creation_secteur on secteurs;
create policy creation_secteur on secteurs for insert
  with check (ouvert = false and membres = 0 and attente = 0);
drop policy if exists lecture_produits on produits;
create policy lecture_produits on produits for select using (true);
drop policy if exists lecture_varietes on varietes;
create policy lecture_varietes on varietes for select using (true);

-- Profils : tout le monde lit les infos publiques, chacun modifie le sien
drop policy if exists lecture_profils on profils;
create policy lecture_profils on profils for select using (true);
drop policy if exists creation_profil on profils;
create policy creation_profil on profils for insert with check (auth.uid() = id);
drop policy if exists maj_profil on profils;
create policy maj_profil on profils for update using (auth.uid() = id);

-- Annonces : visibles par tous si en ligne, modifiables par leur auteur
drop policy if exists lecture_annonces on annonces;
create policy lecture_annonces on annonces for select
  using (statut = 'en_ligne' or vendeur_id = auth.uid());
drop policy if exists creation_annonce on annonces;
create policy creation_annonce on annonces for insert with check (vendeur_id = auth.uid());
drop policy if exists maj_annonce on annonces;
create policy maj_annonce on annonces for update using (vendeur_id = auth.uid());
drop policy if exists suppr_annonce on annonces;
create policy suppr_annonce on annonces for delete using (vendeur_id = auth.uid());

-- Commandes : l'acheteur voit les siennes, le vendeur voit celles qui le concernent
drop policy if exists lecture_commandes on commandes;
create policy lecture_commandes on commandes for select
  using (
    acheteur_id = auth.uid()
    or exists (select 1 from lignes_commande l where l.commande_id = commandes.id and l.vendeur_id = auth.uid())
  );
drop policy if exists creation_commande on commandes;
create policy creation_commande on commandes for insert with check (acheteur_id = auth.uid());
drop policy if exists maj_commande on commandes;
create policy maj_commande on commandes for update
  using (
    acheteur_id = auth.uid()
    or exists (select 1 from lignes_commande l where l.commande_id = commandes.id and l.vendeur_id = auth.uid())
  );

drop policy if exists lecture_lignes on lignes_commande;
create policy lecture_lignes on lignes_commande for select
  using (
    vendeur_id = auth.uid()
    or exists (select 1 from commandes c where c.id = commande_id and c.acheteur_id = auth.uid())
  );
drop policy if exists creation_lignes on lignes_commande;
create policy creation_lignes on lignes_commande for insert
  with check (exists (select 1 from commandes c where c.id = commande_id and c.acheteur_id = auth.uid()));

-- Points : chacun ne voit que son historique
drop policy if exists lecture_points on mouvements_points;
create policy lecture_points on mouvements_points for select using (profil_id = auth.uid());

-- Liste d'attente : insertion libre, lecture réservée à l'intéressé
drop policy if exists insertion_attente on liste_attente;
create policy insertion_attente on liste_attente for insert with check (true);
drop policy if exists lecture_attente on liste_attente;
create policy lecture_attente on liste_attente for select using (profil_id = auth.uid());

-- Avis : lisibles par tous, écrits par l'auteur d'une commande retirée
drop policy if exists lecture_avis on avis;
create policy lecture_avis on avis for select using (true);
drop policy if exists creation_avis on avis;
create policy creation_avis on avis for insert
  with check (
    auteur_id = auth.uid()
    and exists (select 1 from commandes c where c.id = commande_id and c.acheteur_id = auth.uid() and c.statut = 'retiree')
  );

-- ═══════════════════════════════════════════════════════════════
--  CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
-- ═══════════════════════════════════════════════════════════════
create or replace function gerer_nouvel_utilisateur() returns trigger as $$
begin
  insert into public.profils (id, prenom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'prenom', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.role_user, 'amateur')
  )
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_nouvel_utilisateur on auth.users;
create trigger trg_nouvel_utilisateur after insert on auth.users
  for each row execute function gerer_nouvel_utilisateur();

-- ═══════════════════════════════════════════════════════════════
--  STOCKAGE DES PHOTOS
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists lecture_photos on storage.objects;
create policy lecture_photos on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists envoi_photos on storage.objects;
create policy envoi_photos on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

drop policy if exists suppr_photos on storage.objects;
create policy suppr_photos on storage.objects for delete
  using (bucket_id = 'photos' and owner = auth.uid());
