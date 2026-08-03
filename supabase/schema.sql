-- ═══════════════════════════════════════════════════════════════
--  mon-petitpotager.com — schéma de base de données
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

-- ═══════════════════════════════════════════════════════════════
--  ÉVÉNEMENTS LOCAUX
--  Fêtes de village, marchés, brocantes… proposés par les membres.
--  Soumis au même rayon que les annonces : on ne voit que son secteur.
-- ═══════════════════════════════════════════════════════════════
do $$ begin
  create type type_evenement as enum ('marche','fete','brocante','porte_ouverte','autre');
exception when duplicate_object then null; end $$;

create table if not exists evenements (
  id            uuid primary key default uuid_generate_v4(),
  auteur_id     uuid references profils(id) on delete cascade not null,
  secteur       text references secteurs(code_insee) not null,
  titre         text not null,
  description   text,
  type          type_evenement default 'autre' not null,
  debut         timestamptz not null,
  fin           timestamptz,
  lieu          text,
  commune       text not null,
  lat           double precision,
  lon           double precision,
  geo           geography(point, 4326),
  photos        text[] default '{}',
  annule        boolean default false not null,
  created_at    timestamptz default now()
);
create index if not exists idx_evenements_geo   on evenements using gist (geo);
create index if not exists idx_evenements_debut on evenements (debut);
create index if not exists idx_evenements_auteur on evenements (auteur_id);

create or replace function set_evenement_geo() returns trigger as $$
begin
  if new.lat is not null and new.lon is not null then
    new.geo := st_point(new.lon, new.lat)::geography;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_evenement_geo on evenements;
create trigger trg_evenement_geo before insert or update on evenements
  for each row execute function set_evenement_geo();

-- Événements à venir dans le rayon, même logique que annonces_autour.
drop function if exists evenements_autour(double precision, double precision, int, int);
create or replace function evenements_autour(
  p_lat double precision,
  p_lon double precision,
  p_rayon_km int default 20,
  p_limite int default 20
)
returns table (
  id uuid, titre text, description text, type type_evenement,
  debut timestamptz, fin timestamptz, lieu text, commune text,
  photos text[], distance_km numeric, auteur_prenom text, auteur_id uuid
) as $$
  select
    e.id, e.titre, e.description, e.type,
    e.debut, e.fin, e.lieu, e.commune,
    e.photos,
    round((st_distance(e.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    pr.prenom, pr.id
  from evenements e
  join profils pr on pr.id = e.auteur_id
  where e.annule = false
    and e.debut > now() - interval '12 hours'
    and st_dwithin(e.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
  order by e.debut asc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  MESSAGES DE CONTACT
-- ═══════════════════════════════════════════════════════════════
create table if not exists messages_contact (
  id          uuid primary key default uuid_generate_v4(),
  profil_id   uuid references profils(id) on delete set null,
  email       text not null,
  sujet       text not null,
  message     text not null,
  traite      boolean default false not null,
  created_at  timestamptz default now()
);
create index if not exists idx_messages_date on messages_contact (created_at desc);

alter table evenements       enable row level security;
alter table messages_contact enable row level security;

-- Événements : lisibles par tous (le filtre de rayon est fait par la
-- fonction), créés et modifiés par leur auteur uniquement.
drop policy if exists lecture_evenements on evenements;
create policy lecture_evenements on evenements for select using (true);
drop policy if exists creation_evenement on evenements;
create policy creation_evenement on evenements for insert with check (auteur_id = auth.uid());
drop policy if exists maj_evenement on evenements;
create policy maj_evenement on evenements for update using (auteur_id = auth.uid());
drop policy if exists suppr_evenement on evenements;
create policy suppr_evenement on evenements for delete using (auteur_id = auth.uid());

-- Contact : chacun peut écrire, chacun ne relit que ses propres envois.
drop policy if exists ecriture_contact on messages_contact;
create policy ecriture_contact on messages_contact for insert with check (true);
drop policy if exists lecture_contact on messages_contact;
create policy lecture_contact on messages_contact for select using (profil_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
--  PARTICIPATIONS AUX ÉVÉNEMENTS
--  « Comptez-vous y faire un tour ? » — permet à l'organisateur de
--  savoir combien de personnes son annonce touche réellement.
-- ═══════════════════════════════════════════════════════════════
create table if not exists participations (
  id           uuid primary key default uuid_generate_v4(),
  evenement_id uuid references evenements(id) on delete cascade not null,
  profil_id    uuid references profils(id) on delete cascade not null,
  vient        boolean not null,
  created_at   timestamptz default now(),
  unique (evenement_id, profil_id)
);
create index if not exists idx_participations_evt on participations (evenement_id);

alter table participations enable row level security;

-- Les réponses sont visibles de tous : c'est l'intérêt du dispositif,
-- savoir qui vient. Chacun ne peut répondre que pour lui-même.
drop policy if exists lecture_participations on participations;
create policy lecture_participations on participations for select using (true);
drop policy if exists creation_participation on participations;
create policy creation_participation on participations for insert with check (profil_id = auth.uid());
drop policy if exists maj_participation on participations;
create policy maj_participation on participations for update using (profil_id = auth.uid());
drop policy if exists suppr_participation on participations;
create policy suppr_participation on participations for delete using (profil_id = auth.uid());

-- On ajoute le nombre de participants à la liste des événements proches.
drop function if exists evenements_autour(double precision, double precision, int, int);
create or replace function evenements_autour(
  p_lat double precision,
  p_lon double precision,
  p_rayon_km int default 20,
  p_limite int default 20
)
returns table (
  id uuid, titre text, description text, type type_evenement,
  debut timestamptz, fin timestamptz, lieu text, commune text,
  photos text[], distance_km numeric, auteur_prenom text, auteur_id uuid,
  nb_oui bigint
) as $$
  select
    e.id, e.titre, e.description, e.type,
    e.debut, e.fin, e.lieu, e.commune,
    e.photos,
    round((st_distance(e.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    pr.prenom, pr.id,
    (select count(*) from participations pa where pa.evenement_id = e.id and pa.vient)
  from evenements e
  join profils pr on pr.id = e.auteur_id
  where e.annule = false
    and e.debut > now() - interval '12 hours'
    and st_dwithin(e.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
  order by e.debut asc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  PRODUCTEURS PROFESSIONNELS
--  Annuaire des vendeurs professionnels du secteur. Soumis au rayon,
--  comme les annonces et les événements.
-- ═══════════════════════════════════════════════════════════════
drop function if exists producteurs_autour(double precision, double precision, int, int);
create or replace function producteurs_autour(
  p_lat double precision,
  p_lon double precision,
  p_rayon_km int default 20,
  p_limite int default 60
)
returns table (
  id uuid, prenom text, raison_sociale text, bio text, avatar_url text,
  pro_verifie boolean, est_relais boolean, commune text,
  distance_km numeric, nb_annonces bigint
) as $$
  select
    pr.id, pr.prenom, pr.raison_sociale, pr.bio, pr.avatar_url,
    pr.pro_verifie, pr.est_relais, s.nom,
    round((st_distance(s.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    (select count(*) from annonces a
       where a.vendeur_id = pr.id and a.statut = 'en_ligne' and a.quantite > 0)
  from profils pr
  join secteurs s on s.code_insee = pr.secteur
  where pr.role = 'pro'
    and st_dwithin(s.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
  order by (select count(*) from annonces a
              where a.vendeur_id = pr.id and a.statut = 'en_ligne' and a.quantite > 0) desc,
           pr.prenom asc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  VARIÉTÉ LIBRE
--  Le catalogue ne peut pas contenir toutes les variétés existantes.
--  Quand la sienne n'y figure pas, le vendeur la saisit librement :
--  variete_id reste nul et le nom est conservé ici.
-- ═══════════════════════════════════════════════════════════════
alter table annonces add column if not exists variete_libre text;

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
    a.photos, p.categorie, p.nom, coalesce(v.nom, a.variete_libre),
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
--  SUIVI DES COMMANDES CÔTÉ VENDEUR
--  Une commande peut contenir les produits de plusieurs vendeurs.
--  Chacun signale l'avancement de ses propres lignes ; la commande
--  n'avance que lorsque tous les vendeurs ont fait leur part.
--  Le passage à « retirée » reste la confirmation de l'acheteur :
--  c'est ce qui déclenche le versement.
-- ═══════════════════════════════════════════════════════════════
alter table lignes_commande add column if not exists prepare boolean default false not null;
alter table lignes_commande add column if not exists depose  boolean default false not null;

drop policy if exists maj_lignes on lignes_commande;
create policy maj_lignes on lignes_commande for update using (vendeur_id = auth.uid());

create or replace function synchroniser_statut_commande() returns trigger as $$
declare
  total int; nb_prepare int; nb_depose int; actuel statut_commande;
begin
  select count(*), count(*) filter (where prepare), count(*) filter (where depose)
    into total, nb_prepare, nb_depose
    from public.lignes_commande where commande_id = new.commande_id;

  select statut into actuel from public.commandes where id = new.commande_id;

  if actuel in ('confirmee', 'en_preparation') and nb_depose = total and total > 0 then
    update public.commandes set statut = 'deposee' where id = new.commande_id;
  elsif actuel = 'confirmee' and nb_prepare = total and total > 0 then
    update public.commandes set statut = 'en_preparation' where id = new.commande_id;
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_statut_commande on lignes_commande;
create trigger trg_statut_commande after update on lignes_commande
  for each row execute function synchroniser_statut_commande();

-- ═══════════════════════════════════════════════════════════════
--  INDICATEURS DU TABLEAU DE BORD VENDEUR
-- ═══════════════════════════════════════════════════════════════
drop function if exists stats_vendeur(uuid);
create or replace function stats_vendeur(p_vendeur uuid)
returns table (
  ca_total numeric, ca_30j numeric, ca_30j_precedents numeric,
  en_attente_versement numeric, nb_ventes bigint, nb_clients bigint,
  a_preparer bigint, a_deposer bigint,
  annonces_en_ligne bigint, annonces_epuisees bigint,
  stock_total bigint, vues_totales bigint
) as $$
  select
    coalesce((select sum(l.prix_unitaire * l.quantite) from lignes_commande l
              join commandes c on c.id = l.commande_id
              where l.vendeur_id = p_vendeur and c.statut <> 'annulee'), 0),
    coalesce((select sum(l.prix_unitaire * l.quantite) from lignes_commande l
              join commandes c on c.id = l.commande_id
              where l.vendeur_id = p_vendeur and c.statut <> 'annulee'
                and c.created_at >= now() - interval '30 days'), 0),
    coalesce((select sum(l.prix_unitaire * l.quantite) from lignes_commande l
              join commandes c on c.id = l.commande_id
              where l.vendeur_id = p_vendeur and c.statut <> 'annulee'
                and c.created_at >= now() - interval '60 days'
                and c.created_at <  now() - interval '30 days'), 0),
    coalesce((select sum(l.prix_unitaire * l.quantite) from lignes_commande l
              join commandes c on c.id = l.commande_id
              where l.vendeur_id = p_vendeur and l.verse = false
                and c.statut not in ('annulee')), 0),
    (select count(*) from lignes_commande l join commandes c on c.id = l.commande_id
       where l.vendeur_id = p_vendeur and c.statut <> 'annulee'),
    (select count(distinct c.acheteur_id) from lignes_commande l
       join commandes c on c.id = l.commande_id
       where l.vendeur_id = p_vendeur and c.statut <> 'annulee'),
    (select count(distinct l.commande_id) from lignes_commande l
       join commandes c on c.id = l.commande_id
       where l.vendeur_id = p_vendeur and l.prepare = false
         and c.statut in ('confirmee', 'en_preparation')),
    (select count(distinct l.commande_id) from lignes_commande l
       join commandes c on c.id = l.commande_id
       where l.vendeur_id = p_vendeur and l.prepare = true and l.depose = false
         and c.statut in ('confirmee', 'en_preparation')),
    (select count(*) from annonces where vendeur_id = p_vendeur and statut = 'en_ligne' and quantite > 0),
    (select count(*) from annonces where vendeur_id = p_vendeur and statut = 'epuise'),
    coalesce((select sum(quantite) from annonces where vendeur_id = p_vendeur and statut = 'en_ligne'), 0),
    coalesce((select sum(vues) from annonces where vendeur_id = p_vendeur and statut <> 'retire'), 0);
$$ language sql stable;

-- Produits les plus vendus, avec leur position par rapport au prix de référence.
drop function if exists top_produits_vendeur(uuid, int);
create or replace function top_produits_vendeur(p_vendeur uuid, p_limite int default 5)
returns table (titre text, variete text, quantite bigint, chiffre numeric, prix_moyen numeric)
as $$
  select
    l.titre,
    l.variete,
    sum(l.quantite)::bigint,
    sum(l.prix_unitaire * l.quantite),
    round(avg(l.prix_unitaire), 2)
  from lignes_commande l
  join commandes c on c.id = l.commande_id
  where l.vendeur_id = p_vendeur and c.statut <> 'annulee'
  group by l.titre, l.variete
  order by sum(l.prix_unitaire * l.quantite) desc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  PRODUITS TRANSFORMÉS — RÉSERVÉS AUX PROFESSIONNELS
--  La vente de denrées transformées (laitages, conserves, viandes,
--  boissons) suppose un statut déclaré et des obligations sanitaires
--  que les particuliers n'ont pas. Les amateurs ne publient donc que
--  des produits bruts. La règle est appliquée en base, pas seulement
--  dans l'interface : la contourner côté navigateur ne sert à rien.
-- ═══════════════════════════════════════════════════════════════
alter table produits add column if not exists transforme boolean default false not null;

update produits set transforme = true where cle in (
  'confiture','fromage','lait','beurre','yaourt','creme'
);

create or replace function verifier_droit_publication() returns trigger as $$
declare est_transforme boolean; role_vendeur role_user;
begin
  select p.transforme into est_transforme
    from public.produits p where p.id = new.produit_id;
  select pr.role into role_vendeur
    from public.profils pr where pr.id = new.vendeur_id;

  if coalesce(est_transforme, false) and role_vendeur <> 'pro' then
    raise exception 'Ce produit transformé est réservé aux comptes professionnels.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_droit_publication on annonces;
create trigger trg_droit_publication before insert or update on annonces
  for each row execute function verifier_droit_publication();

-- ═══════════════════════════════════════════════════════════════
--  MISE EN AVANT
--  Produits des professionnels du secteur, les annonces boostées
--  d'abord. Réservé aux comptes professionnels : c'est ce qui
--  distingue leur visibilité de celle d'un particulier.
-- ═══════════════════════════════════════════════════════════════
drop function if exists annonces_en_avant(double precision, double precision, int, int);
create or replace function annonces_en_avant(
  p_lat double precision,
  p_lon double precision,
  p_rayon_km int default 20,
  p_limite int default 12
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
    a.photos, p.categorie, p.nom, coalesce(v.nom, a.variete_libre),
    p.prix_ref,
    round((st_distance(a.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    coalesce(pr.raison_sociale, pr.prenom), pr.pro_verifie, pr.id, pr.avatar_url,
    coalesce(v.illustration, p.illustration),
    a.created_at
  from annonces a
  join profils pr on pr.id = a.vendeur_id
  left join produits p on p.id = a.produit_id
  left join varietes v on v.id = a.variete_id
  where a.statut = 'en_ligne'
    and a.quantite > 0
    and pr.role = 'pro'
    and st_dwithin(a.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
  order by
    (a.boost_jusqu_a is not null and a.boost_jusqu_a > now()) desc,
    a.created_at desc
  limit p_limite;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  BONS D'ACHAT
--  Les points ne se dépensent plus au centime près : ils se
--  convertissent par paliers de 1000 points en un bon de 10 €.
--  Le bon est nominatif, à usage unique, et valable un an.
-- ═══════════════════════════════════════════════════════════════
create table if not exists bons_achat (
  id          uuid primary key default uuid_generate_v4(),
  profil_id   uuid references profils(id) on delete cascade not null,
  code        text unique not null,
  montant     numeric(8,2) not null check (montant > 0),
  points_utilises int not null check (points_utilises > 0),
  utilise     boolean default false not null,
  commande_id uuid references commandes(id) on delete set null,
  utilise_le  timestamptz,
  expire_le   timestamptz not null default (now() + interval '1 year'),
  created_at  timestamptz default now()
);
create index if not exists idx_bons_profil on bons_achat (profil_id, utilise);

alter table bons_achat enable row level security;

drop policy if exists lecture_bons on bons_achat;
create policy lecture_bons on bons_achat for select using (profil_id = auth.uid());
drop policy if exists maj_bons on bons_achat;
-- Ni création ni modification directes : un membre pourrait sinon s'octroyer
-- un bon, en changer le montant, ou remettre à zéro un bon déjà consommé.
-- Tout passe par convertir_points() et utiliser_bon().

alter table commandes add column if not exists bon_id uuid references bons_achat(id) on delete set null;

/**
 * Convertit des points en bon d'achat, de façon atomique.
 * Refuse si le solde est insuffisant : le contrôle est ici, pas dans
 * le navigateur, sinon n'importe qui pourrait se créer des bons.
 */
create or replace function convertir_points(p_multiples int)
returns table (code text, montant numeric) as $$
declare
  v_profil uuid := auth.uid();
  v_points_requis int;
  v_montant numeric;
  v_solde int;
  v_code text;
begin
  if v_profil is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;
  if p_multiples is null or p_multiples < 1 then
    raise exception 'Nombre de paliers invalide.' using errcode = 'check_violation';
  end if;

  v_points_requis := p_multiples * 1000;
  v_montant := p_multiples * 10;

  select points into v_solde from public.profils where id = v_profil for update;
  if v_solde is null or v_solde < v_points_requis then
    raise exception 'Points insuffisants pour ce bon d''achat.' using errcode = 'check_violation';
  end if;

  v_code := 'BON-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));

  update public.profils set points = points - v_points_requis, updated_at = now()
    where id = v_profil;

  insert into public.mouvements_points (profil_id, montant, motif)
    values (v_profil, -v_points_requis, 'Conversion en bon d''achat ' || v_code);

  insert into public.bons_achat (profil_id, code, montant, points_utilises)
    values (v_profil, v_code, v_montant, v_points_requis);

  return query select v_code, v_montant;
end $$ language plpgsql security definer set search_path = public;

/**
 * Consomme un bon sur une commande. Atomique : le « utilise = false » dans
 * le WHERE garantit qu'un même bon ne peut pas servir deux fois, même si
 * deux onglets valident en même temps.
 */
create or replace function utiliser_bon(p_bon uuid, p_commande uuid)
returns numeric as $$
declare
  v_profil uuid := auth.uid();
  v_montant numeric;
begin
  if v_profil is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;

  update public.bons_achat
     set utilise = true, utilise_le = now(), commande_id = p_commande
   where id = p_bon
     and profil_id = v_profil
     and utilise = false
     and expire_le > now()
  returning montant into v_montant;

  if v_montant is null then
    raise exception 'Bon d''achat indisponible ou déjà utilisé.' using errcode = 'check_violation';
  end if;

  return v_montant;
end $$ language plpgsql security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  ATTRIBUTION DES POINTS
--  Les points s'obtiennent en achetant et en tenant un point
--  relais. Publier une annonce n'en rapporte pas : sinon il
--  suffirait de publier en boucle pour fabriquer des bons d'achat.
--
--  ajouter_points reste réservée au serveur : elle accepte
--  n'importe quel montant pour n'importe qui, un client ne doit
--  jamais pouvoir l'appeler.
-- ═══════════════════════════════════════════════════════════════
-- Le rôle « public » porte le droit par défaut : le retirer d'anon et
-- d'authenticated seulement ne suffirait pas.
revoke execute on function ajouter_points(uuid, int, text, uuid) from public, anon, authenticated;

/**
 * Crédite les points d'une commande retirée : l'acheteur pour son
 * achat, et l'hôte du point relais pour le service rendu.
 * Appelable uniquement par l'acheteur, une seule fois par commande.
 */
create or replace function crediter_retrait(p_commande uuid)
returns int as $$
declare
  v_profil uuid := auth.uid();
  v_cmd record;
  v_gain int;
begin
  if v_profil is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;

  select id, acheteur_id, sous_total, statut, mode_retrait, relais_id, reference
    into v_cmd from public.commandes where id = p_commande;

  if v_cmd.id is null or v_cmd.acheteur_id <> v_profil then
    raise exception 'Commande introuvable.' using errcode = 'check_violation';
  end if;
  if v_cmd.statut <> 'retiree' then
    raise exception 'Le retrait n''est pas confirmé.' using errcode = 'check_violation';
  end if;
  -- Un seul crédit par commande, même si la page est rechargée.
  if exists (select 1 from public.mouvements_points
              where commande_id = p_commande and montant > 0) then
    return 0;
  end if;

  v_gain := floor(coalesce(v_cmd.sous_total, 0))::int;
  if v_gain > 0 then
    perform public.ajouter_points(v_profil, v_gain,
      'Achat retiré — ' || v_cmd.reference, p_commande);
  end if;

  -- L'hôte du point relais est récompensé, jamais l'acheteur lui-même.
  if v_cmd.mode_retrait = 'relais' and v_cmd.relais_id is not null
     and v_cmd.relais_id <> v_profil then
    perform public.ajouter_points(v_cmd.relais_id, 20,
      'Colis remis en point relais — ' || v_cmd.reference, p_commande);
  end if;

  return v_gain;
end $$ language plpgsql security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  CONFIDENTIALITÉ DES PROFILS
--  Les profils sont lisibles par tous, mais pas dans leur
--  intégralité : le nom de famille, le téléphone, le SIRET et
--  l'identifiant de paiement ne regardent personne d'autre.
-- ═══════════════════════════════════════════════════════════════
-- Un GRANT sur la table entière l'emporte sur un REVOKE de colonnes :
-- on retire donc tout, puis on redonne colonne par colonne.
revoke select on profils from public, anon, authenticated;
grant select (id, prenom, role, secteur, rayon_km, points, avatar_url, bio,
              raison_sociale, pro_verifie, est_relais, relais_adresse,
              relais_horaires, created_at, updated_at)
  on profils to anon, authenticated;

-- Même raisonnement en écriture : sans cela, un membre pourrait porter
-- son propre solde de points à 99 999 et s'émettre des bons d'achat.
-- Le solde ne bouge que par les fonctions du serveur.
revoke update on profils from public, anon, authenticated;
grant update (prenom, nom, telephone, role, secteur, rayon_km, avatar_url, bio,
              siret, raison_sociale, est_relais, relais_adresse, relais_horaires,
              cgu_acceptees_le, updated_at)
  on profils to authenticated;

/** Le membre récupère sa fiche complète par cette fonction. */
create or replace function mon_profil()
returns setof profils as $$
  select * from public.profils where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  PANIERS COMPOSÉS
--  Une annonce peut regrouper plusieurs produits vendus ensemble :
--  6 tomates, 12 abricots et 2 salades pour un prix unique. Le prix
--  de référence du lot est la somme des références de ses produits,
--  ce qui rend la comparaison avec la grande surface vérifiable.
-- ═══════════════════════════════════════════════════════════════
alter table annonces add column if not exists est_lot boolean default false not null;

create table if not exists composants_lot (
  id         uuid primary key default uuid_generate_v4(),
  annonce_id uuid references annonces(id) on delete cascade not null,
  produit_id int  references produits(id) not null,
  variete_id int  references varietes(id),
  quantite   numeric(8,2) not null check (quantite > 0),
  unite      text not null,
  position   int default 0 not null
);
create index if not exists idx_composants_annonce on composants_lot (annonce_id, position);

alter table composants_lot enable row level security;

drop policy if exists lecture_composants on composants_lot;
create policy lecture_composants on composants_lot for select using (true);
drop policy if exists ecriture_composants on composants_lot;
create policy ecriture_composants on composants_lot for all
  using (exists (select 1 from annonces a
                  where a.id = annonce_id and a.vendeur_id = auth.uid()))
  with check (exists (select 1 from annonces a
                       where a.id = annonce_id and a.vendeur_id = auth.uid()));

/** Prix grande surface équivalent d'un lot : somme de ses composants. */
create or replace function prix_reference_lot(p_annonce uuid)
returns numeric as $$
  select round(sum(c.quantite * p.prix_ref), 2)
    from composants_lot c
    join produits p on p.id = c.produit_id
   where c.annonce_id = p_annonce
     and p.prix_ref is not null;
$$ language sql stable;

-- ═══════════════════════════════════════════════════════════════
--  CASIERS RÉFRIGÉRÉS
--  Emplacements tenus par des partenaires. Aucun n'est actif tant
--  qu'un partenariat n'est pas signé : la colonne « actif » dit la
--  vérité au lieu de laisser croire à un service disponible.
-- ═══════════════════════════════════════════════════════════════
create table if not exists casiers (
  id         uuid primary key default uuid_generate_v4(),
  nom        text not null,
  secteur    text references secteurs(code_insee) not null,
  adresse    text not null,
  horaires   text,
  lat        double precision,
  lon        double precision,
  geo        geography(point, 4326),
  actif      boolean default false not null,
  created_at timestamptz default now()
);
create index if not exists idx_casiers_geo on casiers using gist (geo);

alter table casiers enable row level security;
drop policy if exists lecture_casiers on casiers;
create policy lecture_casiers on casiers for select using (true);
-- Aucune écriture depuis l'application : les emplacements sont posés
-- par l'exploitant, pas par les membres.

create or replace function maj_geo_casier() returns trigger as $$
begin
  if new.lat is not null and new.lon is not null then
    new.geo := st_point(new.lon, new.lat)::geography;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_geo_casier on casiers;
create trigger trg_geo_casier before insert or update on casiers
  for each row execute function maj_geo_casier();

/** Casiers du rayon. Même règle que le reste : rien au-delà. */
create or replace function casiers_autour(
  p_lat double precision, p_lon double precision, p_rayon_km int default 20
)
returns table (id uuid, nom text, adresse text, horaires text,
               actif boolean, distance_km numeric) as $$
  select c.id, c.nom, c.adresse, c.horaires, c.actif,
         round((st_distance(c.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1)
    from casiers c
   where st_dwithin(c.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
   order by 6;
$$ language sql stable;

-- Nouveaux modes de retrait sur les commandes.
alter table commandes add column if not exists casier_id uuid references casiers(id) on delete set null;

-- Les lots entrent dans la liste : leur prix de référence est la somme
-- de leurs composants, et leur catégorie est celle du produit dominant.
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
  illustration text, est_lot boolean, nb_composants int,
  created_at timestamptz
) as $$
  select
    a.id, a.titre, a.description, a.mode,
    a.prix, a.unite, a.quantite, a.commune,
    a.photos,
    coalesce(p.categorie, case when a.est_lot then 'Paniers' end),
    p.nom, coalesce(v.nom, a.variete_libre),
    case when a.est_lot then prix_reference_lot(a.id) else p.prix_ref end,
    round((st_distance(a.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
    pr.prenom, pr.pro_verifie, pr.id, pr.avatar_url,
    coalesce(v.illustration, p.illustration,
             case when a.est_lot then 'bocal' end),
    a.est_lot,
    (select count(*)::int from composants_lot c where c.annonce_id = a.id),
    a.created_at
  from annonces a
  join profils pr on pr.id = a.vendeur_id
  left join produits p on p.id = a.produit_id
  left join varietes v on v.id = a.variete_id
  where a.statut = 'en_ligne'
    and a.quantite > 0
    and st_dwithin(a.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
    and (p_categorie is null
         or p.categorie = p_categorie
         or (p_categorie = 'Paniers' and a.est_lot))
  order by
    (a.boost_jusqu_a is not null and a.boost_jusqu_a > now()) desc,
    a.created_at desc
  limit p_limite;
$$ language sql stable;

/**
 * Un lot ne doit pas servir de contournement : sans ce contrôle, un
 * particulier pourrait glisser une terrine dans un panier composé,
 * puisque le lot lui-même n'a pas de produit_id.
 */
create or replace function verifier_composant_lot() returns trigger as $$
declare est_transforme boolean; role_vendeur role_user;
begin
  select p.transforme into est_transforme
    from public.produits p where p.id = new.produit_id;
  select pr.role into role_vendeur
    from public.profils pr
    join public.annonces a on a.vendeur_id = pr.id
   where a.id = new.annonce_id;

  if coalesce(est_transforme, false) and role_vendeur <> 'pro' then
    raise exception 'Ce produit transformé est réservé aux comptes professionnels.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_composant_lot on composants_lot;
create trigger trg_composant_lot before insert or update on composants_lot
  for each row execute function verifier_composant_lot();

-- Une variété libre est possible dans un panier, comme dans une annonce
-- simple : le catalogue ne peut pas tout prévoir.
alter table composants_lot add column if not exists variete_libre text;

-- ═══════════════════════════════════════════════════════════════
--  OUTILS DE GESTION DU PROFESSIONNEL
--  Le vendeur professionnel ne vend pas qu'en ligne : l'essentiel de
--  son activité se fait à la ferme, au marché, en direct. Ces tables
--  lui servent de tenue de compte quotidienne. Elles ne remplacent
--  pas une comptabilité légale : ce sont des relevés de suivi.
-- ═══════════════════════════════════════════════════════════════

-- ── Ventes réalisées hors du site ──
create table if not exists ventes_directes (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references profils(id) on delete cascade not null,
  date_vente  date not null default current_date,
  produit_id  int references produits(id),
  libelle     text not null,
  variete     text,
  quantite    numeric(10,2) not null check (quantite > 0),
  unite       text not null,
  prix_unitaire numeric(8,2) not null check (prix_unitaire >= 0),
  total       numeric(10,2) not null check (total >= 0),
  canal       text not null default 'ferme',      -- ferme | marche | tournee | autre
  paiement    text not null default 'especes',    -- especes | carte | cheque | virement
  note        text,
  created_at  timestamptz default now()
);
create index if not exists idx_ventes_directes on ventes_directes (vendeur_id, date_vente desc);

-- ── Dépenses ──
create table if not exists depenses (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references profils(id) on delete cascade not null,
  date_depense date not null default current_date,
  categorie   text not null default 'autre',      -- semences | plants | engrais | materiel |
                                                  -- carburant | emballage | cotisation | autre
  libelle     text not null,
  fournisseur text,
  montant     numeric(10,2) not null check (montant > 0),
  note        text,
  created_at  timestamptz default now()
);
create index if not exists idx_depenses on depenses (vendeur_id, date_depense desc);

-- ── Inventaire ──
create table if not exists inventaire (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references profils(id) on delete cascade not null,
  produit_id  int references produits(id),
  libelle     text not null,
  variete     text,
  quantite    numeric(10,2) not null default 0 check (quantite >= 0),
  unite       text not null default 'kg',
  seuil_alerte numeric(10,2) default 0 not null check (seuil_alerte >= 0),
  emplacement text,
  peremption  date,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);
create index if not exists idx_inventaire on inventaire (vendeur_id, libelle);

-- ── Pense-bête ──
create table if not exists taches (
  id          uuid primary key default uuid_generate_v4(),
  vendeur_id  uuid references profils(id) on delete cascade not null,
  titre       text not null,
  detail      text,
  echeance    date,
  priorite    int default 1 not null check (priorite between 0 and 2), -- 0 basse, 2 haute
  categorie   text default 'general' not null,   -- culture | vente | administratif |
                                                 -- materiel | general
  faite       boolean default false not null,
  faite_le    timestamptz,
  created_at  timestamptz default now()
);
create index if not exists idx_taches on taches (vendeur_id, faite, echeance);

-- ── Règles d'accès : chacun chez soi, et professionnels seulement ──
do $$
declare t text;
begin
  foreach t in array array['ventes_directes','depenses','inventaire','taches'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists proprietaire_%I on %I', t, t);
    execute format($p$create policy proprietaire_%I on %I for all
                       using (vendeur_id = auth.uid())
                       with check (vendeur_id = auth.uid())$p$, t, t);
  end loop;
end $$;

/**
 * Ces outils sont réservés aux comptes professionnels. Le contrôle est
 * en base : une règle affichée seulement dans l'interface ne serait
 * pas une règle.
 */
create or replace function verifier_compte_pro() returns trigger as $$
begin
  if (select role from public.profils where id = new.vendeur_id) <> 'pro' then
    raise exception 'Ces outils sont réservés aux comptes professionnels.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

do $$
declare t text;
begin
  foreach t in array array['ventes_directes','depenses','inventaire','taches'] loop
    execute format('drop trigger if exists trg_pro_%I on %I', t, t);
    execute format('create trigger trg_pro_%I before insert on %I
                    for each row execute function verifier_compte_pro()', t, t);
  end loop;
end $$;

/**
 * Relevé mensuel du professionnel sur douze mois : ventes en ligne
 * effectivement versées, ventes directes, dépenses, résultat.
 * Une vente en ligne n'est comptée qu'une fois versée, c'est-à-dire
 * après confirmation de retrait : c'est la règle du site, la compta
 * ne doit pas la contredire.
 */
create or replace function releve_mensuel(p_mois int default 12)
returns table (
  mois date, ventes_ligne numeric, ventes_directes numeric,
  depenses numeric, resultat numeric
) as $$
  with periode as (
    select generate_series(
      date_trunc('month', current_date) - ((p_mois - 1) || ' months')::interval,
      date_trunc('month', current_date), '1 month'
    )::date as mois
  ),
  ligne as (
    select date_trunc('month', l.verse_le)::date as mois,
           sum(l.prix_unitaire * l.quantite) as total
      from lignes_commande l
     where l.vendeur_id = auth.uid() and l.verse and l.verse_le is not null
     group by 1
  ),
  directe as (
    select date_trunc('month', date_vente)::date as mois, sum(total) as total
      from ventes_directes where vendeur_id = auth.uid() group by 1
  ),
  sortie as (
    select date_trunc('month', date_depense)::date as mois, sum(montant) as total
      from depenses where vendeur_id = auth.uid() group by 1
  )
  select p.mois,
         coalesce(l.total, 0), coalesce(d.total, 0), coalesce(s.total, 0),
         coalesce(l.total, 0) + coalesce(d.total, 0) - coalesce(s.total, 0)
    from periode p
    left join ligne l on l.mois = p.mois
    left join directe d on d.mois = p.mois
    left join sortie s on s.mois = p.mois
   order by p.mois;
$$ language sql stable security definer set search_path = public;

/** Les produits qui rapportent le plus, en ligne et en direct confondus. */
create or replace function palmares_produits(p_jours int default 90)
returns table (libelle text, quantite numeric, chiffre numeric) as $$
  select libelle, sum(quantite), sum(chiffre) from (
    select l.titre as libelle, l.quantite::numeric,
           l.prix_unitaire * l.quantite as chiffre
      from lignes_commande l
     where l.vendeur_id = auth.uid() and l.verse
       and l.verse_le > now() - (p_jours || ' days')::interval
    union all
    select v.libelle, v.quantite, v.total
      from ventes_directes v
     where v.vendeur_id = auth.uid()
       and v.date_vente > current_date - p_jours
  ) t
  group by libelle order by 3 desc limit 8;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  COURRIELS
--  Tout envoi est d'abord consigné ici. Si le service d'envoi est
--  indisponible, le message n'est pas perdu : il reste en attente et
--  l'on sait exactement ce qui n'est pas parti.
-- ═══════════════════════════════════════════════════════════════
create table if not exists courriels (
  id          uuid primary key default uuid_generate_v4(),
  destinataire text not null,
  sujet       text not null,
  corps       text not null,
  motif       text not null,
  commande_id uuid references commandes(id) on delete set null,
  statut      text not null default 'en_attente',  -- en_attente | envoye | echec
  erreur      text,
  envoye_le   timestamptz,
  created_at  timestamptz default now()
);
create index if not exists idx_courriels on courriels (statut, created_at desc);

alter table courriels enable row level security;
-- Aucune règle : la table n'est accessible qu'au serveur, qui utilise
-- la clé de service. Un membre n'a pas à lire le courrier des autres.

/**
 * Adresses de l'acheteur et des vendeurs d'une commande, pour
 * prévenir tout le monde d'un retrait confirmé. Réservée au serveur.
 */
create or replace function destinataires_commande(p_commande uuid)
returns table (email text, prenom text, role text) as $$
  select u.email::text, p.prenom, 'acheteur'
    from commandes c
    join profils p on p.id = c.acheteur_id
    join auth.users u on u.id = p.id
   where c.id = p_commande
  union
  select u.email::text, p.prenom, 'vendeur'
    from lignes_commande l
    join profils p on p.id = l.vendeur_id
    join auth.users u on u.id = p.id
   where l.commande_id = p_commande;
$$ language sql stable security definer set search_path = public;

revoke execute on function destinataires_commande(uuid) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
--  OUVERTURE DES SECTEURS
--  Le seuil des 200 voisins est levé : tout secteur est ouvert dès
--  sa création. La liste d'attente reste alimentée, elle sert
--  désormais à mesurer l'intérêt, plus à conditionner l'accès.
-- ═══════════════════════════════════════════════════════════════
alter table secteurs alter column ouvert set default true;
update secteurs set ouvert = true, ouvert_le = coalesce(ouvert_le, now()) where ouvert = false;

drop trigger if exists trg_ouverture on liste_attente;

-- La règle de création s'adapte : un secteur naît ouvert, mais toujours
-- sans membre ni inscrit, pour qu'on ne puisse pas s'en inventer un peuplé.
drop policy if exists creation_secteur on secteurs;
create policy creation_secteur on secteurs for insert
  with check (ouvert = true and membres = 0 and attente = 0);

-- ═══════════════════════════════════════════════════════════════
--  PROFIL PLUS COMPLET
--  De quoi se présenter vraiment à ses voisins, et pour un
--  professionnel, décrire son exploitation.
-- ═══════════════════════════════════════════════════════════════
alter table profils add column if not exists site_web text;
alter table profils add column if not exists reseau_social text;
alter table profils add column if not exists disponibilites text;
alter table profils add column if not exists moyens_paiement text[] default '{}';
alter table profils add column if not exists methode_culture text;
alter table profils add column if not exists label_qualite text;
alter table profils add column if not exists annee_installation int
  check (annee_installation is null or annee_installation between 1900 and 2100);
alter table profils add column if not exists surface_ha numeric(8,2)
  check (surface_ha is null or surface_ha >= 0);
alter table profils add column if not exists specialites text;

-- Ces champs sont publics : ils décrivent l'offre, pas la personne.
grant select (site_web, reseau_social, disponibilites, moyens_paiement,
              methode_culture, label_qualite, annee_installation,
              surface_ha, specialites)
  on profils to anon, authenticated;
grant update (site_web, reseau_social, disponibilites, moyens_paiement,
              methode_culture, label_qualite, annee_installation,
              surface_ha, specialites)
  on profils to authenticated;

/**
 * Changement de commune de rattachement.
 * Le compteur de membres suit le déplacement, sinon les secteurs
 * afficheraient des voisins qui n'y sont plus.
 */
create or replace function changer_secteur(p_code text)
returns void as $$
declare
  v_profil uuid := auth.uid();
  v_ancien text;
begin
  if v_profil is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.secteurs where code_insee = p_code) then
    raise exception 'Commune inconnue.' using errcode = 'check_violation';
  end if;

  select secteur into v_ancien from public.profils where id = v_profil;
  if v_ancien is not distinct from p_code then return; end if;

  update public.profils set secteur = p_code, updated_at = now() where id = v_profil;

  if v_ancien is not null then
    update public.secteurs set membres = greatest(0, membres - 1) where code_insee = v_ancien;
  end if;
  update public.secteurs set membres = membres + 1 where code_insee = p_code;
end $$ language plpgsql security definer set search_path = public;

-- Le compteur de membres avait dérivé : on le recale sur la réalité
-- des profils, seule source qui fasse foi.
update secteurs s set membres = (
  select count(*) from profils p where p.secteur = s.code_insee
);

-- ═══════════════════════════════════════════════════════════════
--  CLASSEMENT DES VOISINS
--  Un classement des membres les plus actifs du secteur. La règle du
--  rayon s'applique ici comme ailleurs : on ne voit que ses voisins.
--  Il repose sur les points, donc sur les achats retirés et les
--  colis remis en point relais, pas sur le nombre d'annonces.
-- ═══════════════════════════════════════════════════════════════
create or replace function classement_voisins(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_limite int default 10
)
returns table (
  id uuid, prenom text, avatar_url text, role text,
  points int, est_relais boolean, nb_annonces int, commune text
) as $$
  select p.id, coalesce(p.raison_sociale, p.prenom), p.avatar_url, p.role::text,
         p.points, p.est_relais,
         (select count(*)::int from annonces a
           where a.vendeur_id = p.id and a.statut = 'en_ligne' and a.quantite > 0),
         s.nom
    from profils p
    join secteurs s on s.code_insee = p.secteur
   where st_dwithin(st_point(s.lon, s.lat)::geography,
                    st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
     and p.points > 0
   order by p.points desc, p.created_at
   limit p_limite;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  MODÉRATION
--  Un modérateur peut retirer ou corriger n'importe quelle annonce.
--  C'est un pouvoir large : chaque intervention est donc journalisée,
--  avec son motif, et le statut ne s'accorde pas depuis l'interface.
-- ═══════════════════════════════════════════════════════════════
alter table profils add column if not exists moderateur boolean default false not null;
-- Volontairement absent des colonnes modifiables par un membre : nul ne
-- se nomme modérateur soi-même.
grant select (moderateur) on profils to anon, authenticated;

create or replace function est_moderateur() returns boolean as $$
  select coalesce((select moderateur from public.profils where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- Les annonces : leur auteur, ou un modérateur.
drop policy if exists maj_annonce on annonces;
create policy maj_annonce on annonces for update
  using (vendeur_id = auth.uid() or est_moderateur());
drop policy if exists suppression_annonce on annonces;
create policy suppression_annonce on annonces for delete
  using (vendeur_id = auth.uid() or est_moderateur());

create table if not exists journal_moderation (
  id           uuid primary key default uuid_generate_v4(),
  moderateur_id uuid references profils(id) on delete set null,
  annonce_id   uuid,
  titre        text,
  vendeur_id   uuid,
  action       text not null,          -- masquee | supprimee | corrigee | retablie
  motif        text not null,
  created_at   timestamptz default now()
);
create index if not exists idx_journal_mod on journal_moderation (created_at desc);

alter table journal_moderation enable row level security;
drop policy if exists lecture_journal on journal_moderation;
create policy lecture_journal on journal_moderation for select using (est_moderateur());
-- Aucune écriture directe : le journal se remplit par moderer_annonce().

/**
 * Action de modération sur une annonce, journalisée.
 * Le motif est obligatoire : une suppression sans raison écrite n'est
 * pas défendable si l'auteur la conteste.
 */
create or replace function moderer_annonce(
  p_annonce uuid, p_action text, p_motif text
) returns void as $$
declare v_a record;
begin
  if not est_moderateur() then
    raise exception 'Action réservée à la modération.' using errcode = 'check_violation';
  end if;
  if p_motif is null or length(trim(p_motif)) < 3 then
    raise exception 'Un motif est obligatoire.' using errcode = 'check_violation';
  end if;
  if p_action not in ('masquee', 'supprimee', 'retablie') then
    raise exception 'Action inconnue.' using errcode = 'check_violation';
  end if;

  select id, titre, vendeur_id into v_a from public.annonces where id = p_annonce;
  if v_a.id is null then
    raise exception 'Annonce introuvable.' using errcode = 'check_violation';
  end if;

  insert into public.journal_moderation
    (moderateur_id, annonce_id, titre, vendeur_id, action, motif)
    values (auth.uid(), v_a.id, v_a.titre, v_a.vendeur_id, p_action, trim(p_motif));

  if p_action = 'supprimee' then
    delete from public.annonces where id = p_annonce;
  elsif p_action = 'masquee' then
    update public.annonces set statut = 'retire', updated_at = now() where id = p_annonce;
  else
    update public.annonces set statut = 'en_ligne', updated_at = now() where id = p_annonce;
  end if;
end $$ language plpgsql security definer set search_path = public;

/** Toutes les annonces, sans filtre de rayon : la modération doit voir
 *  ce qui se publie partout, y compris ce qui est déjà retiré. */
create or replace function annonces_a_moderer(p_recherche text default null, p_limite int default 60)
returns table (
  id uuid, titre text, description text, statut text, mode text,
  prix numeric, unite text, quantite int, commune text, photos text[],
  est_lot boolean, vendeur_id uuid, vendeur_prenom text, vendeur_role text,
  illustration text, created_at timestamptz
) as $$
  select a.id, a.titre, a.description, a.statut::text, a.mode::text,
         a.prix, a.unite, a.quantite, a.commune, a.photos,
         a.est_lot, a.vendeur_id, coalesce(pr.raison_sociale, pr.prenom), pr.role::text,
         coalesce(v.illustration, p.illustration, case when a.est_lot then 'bocal' end),
         a.created_at
    from annonces a
    join profils pr on pr.id = a.vendeur_id
    left join produits p on p.id = a.produit_id
    left join varietes v on v.id = a.variete_id
   where est_moderateur()
     and (p_recherche is null or p_recherche = ''
          or a.titre ilike '%' || p_recherche || '%'
          or a.commune ilike '%' || p_recherche || '%'
          or coalesce(pr.raison_sociale, pr.prenom) ilike '%' || p_recherche || '%')
   order by a.created_at desc
   limit p_limite;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  VIE DES ÉVÉNEMENTS
--  Un événement ne s'arrête pas quand il est passé : ceux qui y
--  étaient racontent, montrent leurs photos. C'est ce qui donne
--  envie de venir la fois suivante.
-- ═══════════════════════════════════════════════════════════════
drop policy if exists maj_evenement on evenements;
create policy maj_evenement on evenements for update
  using (auteur_id = auth.uid() or est_moderateur());
drop policy if exists suppr_evenement on evenements;
create policy suppr_evenement on evenements for delete
  using (auteur_id = auth.uid() or est_moderateur());

create table if not exists publications_evenement (
  id           uuid primary key default uuid_generate_v4(),
  evenement_id uuid references evenements(id) on delete cascade not null,
  auteur_id    uuid references profils(id) on delete cascade not null,
  texte        text not null check (length(trim(texte)) between 1 and 1000),
  photos       text[] default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_pub_evt on publications_evenement (evenement_id, created_at desc);

alter table publications_evenement enable row level security;

drop policy if exists lecture_pub_evt on publications_evenement;
create policy lecture_pub_evt on publications_evenement for select using (true);
drop policy if exists maj_pub_evt on publications_evenement;
create policy maj_pub_evt on publications_evenement for update using (auteur_id = auth.uid());
drop policy if exists suppr_pub_evt on publications_evenement;
create policy suppr_pub_evt on publications_evenement for delete
  using (auteur_id = auth.uid() or est_moderateur());

-- On ne publie pas sur un événement qui n'a pas commencé : sinon le mur
-- se remplit de commentaires d'avant, et ce n'est plus un souvenir.
drop policy if exists creation_pub_evt on publications_evenement;
create policy creation_pub_evt on publications_evenement for insert
  with check (
    auteur_id = auth.uid()
    and exists (select 1 from evenements e
                 where e.id = evenement_id and e.debut <= now())
  );

/** Publications d'un événement, avec l'auteur, pour l'affichage. */
create or replace function publications_de(p_evenement uuid)
returns table (
  id uuid, texte text, photos text[], created_at timestamptz,
  auteur_id uuid, auteur_prenom text, auteur_avatar text, auteur_role text
) as $$
  select pu.id, pu.texte, pu.photos, pu.created_at,
         pr.id, coalesce(pr.raison_sociale, pr.prenom), pr.avatar_url, pr.role::text
    from publications_evenement pu
    join profils pr on pr.id = pu.auteur_id
   where pu.evenement_id = p_evenement
   order by pu.created_at desc;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  MESSAGERIE INTERNE
--  Demander si un produit est encore disponible, convenir d'une
--  heure de retrait, discuter d'un prix. Une conversation lie deux
--  membres, éventuellement à propos d'une annonce précise.
-- ═══════════════════════════════════════════════════════════════
create table if not exists conversations (
  id            uuid primary key default uuid_generate_v4(),
  annonce_id    uuid references annonces(id) on delete set null,
  -- Le couple est rangé dans un ordre fixe : sans cela, A→B et B→A
  -- créeraient deux fils pour la même discussion.
  membre_min    uuid references profils(id) on delete cascade not null,
  membre_max    uuid references profils(id) on delete cascade not null,
  sujet         text,
  dernier_le    timestamptz default now() not null,
  created_at    timestamptz default now(),
  check (membre_min < membre_max)
);
create unique index if not exists idx_conv_unique
  on conversations (membre_min, membre_max, coalesce(annonce_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists idx_conv_membres on conversations (membre_min, dernier_le desc);
create index if not exists idx_conv_membres2 on conversations (membre_max, dernier_le desc);

create table if not exists messages_prives (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  auteur_id       uuid references profils(id) on delete cascade not null,
  texte           text not null check (length(trim(texte)) between 1 and 2000),
  prix_propose    numeric(8,2) check (prix_propose is null or prix_propose >= 0),
  lu_le           timestamptz,
  created_at      timestamptz default now()
);
create index if not exists idx_msg_conv on messages_prives (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages_prives enable row level security;

drop policy if exists lecture_conv on conversations;
create policy lecture_conv on conversations for select
  using (auth.uid() in (membre_min, membre_max));
drop policy if exists maj_conv on conversations;
create policy maj_conv on conversations for update
  using (auth.uid() in (membre_min, membre_max));
-- Création uniquement par ouvrir_conversation() : la règle du rayon s'y vérifie.

drop policy if exists lecture_msg on messages_prives;
create policy lecture_msg on messages_prives for select
  using (exists (select 1 from conversations c
                  where c.id = conversation_id
                    and auth.uid() in (c.membre_min, c.membre_max)));
drop policy if exists creation_msg on messages_prives;
create policy creation_msg on messages_prives for insert
  with check (auteur_id = auth.uid()
    and exists (select 1 from conversations c
                 where c.id = conversation_id
                   and auth.uid() in (c.membre_min, c.membre_max)));
drop policy if exists maj_msg on messages_prives;
create policy maj_msg on messages_prives for update
  using (exists (select 1 from conversations c
                  where c.id = conversation_id
                    and auth.uid() in (c.membre_min, c.membre_max)));
drop policy if exists suppr_msg on messages_prives;
create policy suppr_msg on messages_prives for delete
  using (auteur_id = auth.uid() or est_moderateur());

/**
 * Ouvre une conversation, ou retrouve celle qui existe déjà.
 * La règle du rayon vaut ici aussi : on n'écrit pas à quelqu'un qu'on
 * ne pourrait pas voir. Sans quoi la messagerie serait une porte
 * dérobée pour contacter la France entière.
 */
create or replace function ouvrir_conversation(p_destinataire uuid, p_annonce uuid default null)
returns uuid as $$
declare
  v_moi uuid := auth.uid();
  v_min uuid; v_max uuid;
  v_conv uuid;
  v_km numeric;
  v_sujet text;
begin
  if v_moi is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;
  if p_destinataire = v_moi then
    raise exception 'On ne s''écrit pas à soi-même.' using errcode = 'check_violation';
  end if;

  select round((st_distance(sa.geo_pt, sb.geo_pt) / 1000)::numeric, 1) into v_km
    from (select st_point(s.lon, s.lat)::geography as geo_pt, p.rayon_km
            from profils p join secteurs s on s.code_insee = p.secteur
           where p.id = v_moi) sa,
         (select st_point(s.lon, s.lat)::geography as geo_pt
            from profils p join secteurs s on s.code_insee = p.secteur
           where p.id = p_destinataire) sb;

  if v_km is null or v_km > (select rayon_km from profils where id = v_moi) then
    raise exception 'Ce membre est hors de votre rayon.' using errcode = 'check_violation';
  end if;

  v_min := least(v_moi, p_destinataire);
  v_max := greatest(v_moi, p_destinataire);

  select id into v_conv from conversations
   where membre_min = v_min and membre_max = v_max
     and coalesce(annonce_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(p_annonce, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_conv is not null then return v_conv; end if;

  if p_annonce is not null then
    select titre into v_sujet from annonces where id = p_annonce;
  end if;

  insert into conversations (annonce_id, membre_min, membre_max, sujet)
    values (p_annonce, v_min, v_max, v_sujet)
    returning id into v_conv;
  return v_conv;
end $$ language plpgsql security definer set search_path = public;

/** Fils de discussion du membre, avec le correspondant et le dernier mot. */
create or replace function mes_conversations()
returns table (
  id uuid, annonce_id uuid, sujet text, dernier_le timestamptz,
  autre_id uuid, autre_prenom text, autre_avatar text,
  dernier_texte text, dernier_auteur uuid, non_lus int
) as $$
  select c.id, c.annonce_id, c.sujet, c.dernier_le,
         a.id, coalesce(a.raison_sociale, a.prenom), a.avatar_url,
         d.texte, d.auteur_id,
         (select count(*)::int from messages_prives m
           where m.conversation_id = c.id and m.auteur_id <> auth.uid() and m.lu_le is null)
    from conversations c
    join profils a on a.id = case when c.membre_min = auth.uid() then c.membre_max else c.membre_min end
    left join lateral (
      select texte, auteur_id from messages_prives m
       where m.conversation_id = c.id order by m.created_at desc limit 1
    ) d on true
   where auth.uid() in (c.membre_min, c.membre_max)
   order by c.dernier_le desc;
$$ language sql stable security definer set search_path = public;

/** Nombre de messages non lus, pour la pastille de navigation. */
create or replace function messages_non_lus()
returns int as $$
  select count(*)::int from messages_prives m
    join conversations c on c.id = m.conversation_id
   where auth.uid() in (c.membre_min, c.membre_max)
     and m.auteur_id <> auth.uid() and m.lu_le is null;
$$ language sql stable security definer set search_path = public;

/** Marque comme lus les messages reçus d'une conversation. */
create or replace function marquer_lus(p_conversation uuid)
returns void as $$
  update messages_prives m set lu_le = now()
    from conversations c
   where c.id = m.conversation_id
     and m.conversation_id = p_conversation
     and auth.uid() in (c.membre_min, c.membre_max)
     and m.auteur_id <> auth.uid()
     and m.lu_le is null;
$$ language sql security definer set search_path = public;

-- Le fil remonte en tête de liste à chaque message.
create or replace function toucher_conversation() returns trigger as $$
begin
  update public.conversations set dernier_le = now() where id = new.conversation_id;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_toucher_conv on messages_prives;
create trigger trg_toucher_conv after insert on messages_prives
  for each row execute function toucher_conversation();

-- ═══════════════════════════════════════════════════════════════
--  COMPTES D'ORGANISATION
--  Mairies et associations publient des informations à leur secteur
--  et consultent les habitants. Le statut est déclaratif à
--  l'inscription mais affiché comme non vérifié tant que la
--  modération ne l'a pas confirmé : se faire passer pour une mairie
--  ne doit pas être gratuit.
-- ═══════════════════════════════════════════════════════════════
alter table profils add column if not exists organisation text
  check (organisation is null or organisation in ('mairie', 'association', 'collectif'));
alter table profils add column if not exists organisation_nom text;
alter table profils add column if not exists organisation_verifiee boolean default false not null;

grant select (organisation, organisation_nom, organisation_verifiee)
  on profils to anon, authenticated;
-- Le nom et le type se déclarent ; la vérification, non.
grant update (organisation, organisation_nom) on profils to authenticated;

create or replace function est_organisation(p_profil uuid default null) returns boolean as $$
  select coalesce((select organisation is not null from public.profils
                    where id = coalesce(p_profil, auth.uid())), false);
$$ language sql stable security definer set search_path = public;

-- ── Publications officielles ──
create table if not exists publications_officielles (
  id          uuid primary key default uuid_generate_v4(),
  auteur_id   uuid references profils(id) on delete cascade not null,
  secteur     text references secteurs(code_insee) not null,
  categorie   text not null default 'information',
  -- information | alerte | travaux | evenement | consultation | rappel
  titre       text not null check (length(trim(titre)) between 3 and 140),
  texte       text not null check (length(trim(texte)) between 3 and 4000),
  photos      text[] default '{}',
  lien        text,
  epinglee    boolean default false not null,
  expire_le   timestamptz,
  lat         double precision,
  lon         double precision,
  geo         geography(point, 4326),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_pubof_geo on publications_officielles using gist (geo);
create index if not exists idx_pubof_date on publications_officielles (created_at desc);

create or replace function geo_publication_officielle() returns trigger as $$
begin
  if new.lat is null or new.lon is null then
    select s.lat, s.lon into new.lat, new.lon
      from public.secteurs s where s.code_insee = new.secteur;
  end if;
  new.geo := st_point(new.lon, new.lat)::geography;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_geo_pubof on publications_officielles;
create trigger trg_geo_pubof before insert or update on publications_officielles
  for each row execute function geo_publication_officielle();

alter table publications_officielles enable row level security;
drop policy if exists lecture_pubof on publications_officielles;
create policy lecture_pubof on publications_officielles for select using (true);
drop policy if exists creation_pubof on publications_officielles;
create policy creation_pubof on publications_officielles for insert
  with check (auteur_id = auth.uid() and est_organisation());
drop policy if exists maj_pubof on publications_officielles;
create policy maj_pubof on publications_officielles for update
  using (auteur_id = auth.uid() or est_moderateur());
drop policy if exists suppr_pubof on publications_officielles;
create policy suppr_pubof on publications_officielles for delete
  using (auteur_id = auth.uid() or est_moderateur());

-- ── Sondages ──
create table if not exists sondages (
  id            uuid primary key default uuid_generate_v4(),
  publication_id uuid references publications_officielles(id) on delete cascade,
  auteur_id     uuid references profils(id) on delete cascade not null,
  secteur       text references secteurs(code_insee) not null,
  question      text not null check (length(trim(question)) between 3 and 300),
  precisions    text,
  choix_multiple boolean default false not null,
  anonyme       boolean default true not null,
  clos_le       timestamptz,
  lat           double precision,
  lon           double precision,
  geo           geography(point, 4326),
  created_at    timestamptz default now()
);
create index if not exists idx_sondages_geo on sondages using gist (geo);

create table if not exists sondage_options (
  id         uuid primary key default uuid_generate_v4(),
  sondage_id uuid references sondages(id) on delete cascade not null,
  libelle    text not null check (length(trim(libelle)) between 1 and 120),
  position   int default 0 not null
);
create index if not exists idx_sondage_options on sondage_options (sondage_id, position);

create table if not exists sondage_votes (
  id         uuid primary key default uuid_generate_v4(),
  sondage_id uuid references sondages(id) on delete cascade not null,
  option_id  uuid references sondage_options(id) on delete cascade not null,
  profil_id  uuid references profils(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (option_id, profil_id)
);
create index if not exists idx_sondage_votes on sondage_votes (sondage_id, profil_id);

create or replace function geo_sondage() returns trigger as $$
begin
  if new.lat is null or new.lon is null then
    select s.lat, s.lon into new.lat, new.lon
      from public.secteurs s where s.code_insee = new.secteur;
  end if;
  new.geo := st_point(new.lon, new.lat)::geography;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_geo_sondage on sondages;
create trigger trg_geo_sondage before insert or update on sondages
  for each row execute function geo_sondage();

alter table sondages enable row level security;
alter table sondage_options enable row level security;
alter table sondage_votes enable row level security;

drop policy if exists lecture_sondages on sondages;
create policy lecture_sondages on sondages for select using (true);
drop policy if exists creation_sondage on sondages;
create policy creation_sondage on sondages for insert
  with check (auteur_id = auth.uid() and est_organisation());
drop policy if exists maj_sondage on sondages;
create policy maj_sondage on sondages for update
  using (auteur_id = auth.uid() or est_moderateur());
drop policy if exists suppr_sondage on sondages;
create policy suppr_sondage on sondages for delete
  using (auteur_id = auth.uid() or est_moderateur());

drop policy if exists lecture_options on sondage_options;
create policy lecture_options on sondage_options for select using (true);
drop policy if exists ecriture_options on sondage_options;
create policy ecriture_options on sondage_options for all
  using (exists (select 1 from sondages s
                  where s.id = sondage_id and s.auteur_id = auth.uid()))
  with check (exists (select 1 from sondages s
                       where s.id = sondage_id and s.auteur_id = auth.uid()));

-- Les votes ne sont jamais lisibles nominativement par autrui : chacun
-- ne voit que le sien. Les totaux passent par une fonction.
drop policy if exists lecture_votes on sondage_votes;
create policy lecture_votes on sondage_votes for select using (profil_id = auth.uid());
drop policy if exists creation_vote on sondage_votes;
create policy creation_vote on sondage_votes for insert
  with check (profil_id = auth.uid()
    and exists (select 1 from sondages s where s.id = sondage_id
                 and (s.clos_le is null or s.clos_le > now())));
drop policy if exists suppr_vote on sondage_votes;
create policy suppr_vote on sondage_votes for delete using (profil_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
--  NOTIFICATIONS
--  Une publication de la mairie ou un sondage arrive dans l'espace
--  Messages, à côté des conversations. Chaque habitant du rayon en
--  reçoit une, et la marque lue à la lecture.
-- ═══════════════════════════════════════════════════════════════
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  profil_id   uuid references profils(id) on delete cascade not null,
  categorie   text not null,          -- publication | sondage
  titre       text not null,
  apercu      text,
  lien        text not null,
  auteur_nom  text,
  lu_le       timestamptz,
  created_at  timestamptz default now()
);
create index if not exists idx_notif on notifications (profil_id, lu_le, created_at desc);

alter table notifications enable row level security;
drop policy if exists lecture_notif on notifications;
create policy lecture_notif on notifications for select using (profil_id = auth.uid());
drop policy if exists maj_notif on notifications;
create policy maj_notif on notifications for update using (profil_id = auth.uid());
drop policy if exists suppr_notif on notifications;
create policy suppr_notif on notifications for delete using (profil_id = auth.uid());
-- Création réservée aux déclencheurs : personne ne notifie à la main.

/**
 * Prévient les habitants du rayon d'une nouvelle publication.
 * Le rayon de chaque habitant est respecté : on ne notifie pas
 * quelqu'un pour une commune qu'il ne verrait pas.
 */
create or replace function notifier_secteur(
  p_geo geography, p_categorie text, p_titre text,
  p_apercu text, p_lien text, p_auteur uuid
) returns int as $$
declare v_nom text; v_n int;
begin
  select coalesce(organisation_nom, raison_sociale, prenom) into v_nom
    from public.profils where id = p_auteur;

  insert into public.notifications (profil_id, categorie, titre, apercu, lien, auteur_nom)
  select p.id, p_categorie, p_titre, left(coalesce(p_apercu, ''), 160), p_lien, v_nom
    from public.profils p
    join public.secteurs s on s.code_insee = p.secteur
   where p.id <> p_auteur
     and st_dwithin(p_geo, st_point(s.lon, s.lat)::geography, p.rayon_km * 1000);

  get diagnostics v_n = row_count;
  return v_n;
end $$ language plpgsql security definer set search_path = public;

create or replace function notifier_publication() returns trigger as $$
begin
  perform notifier_secteur(new.geo, 'publication', new.titre,
    new.texte, '/informations/' || new.id, new.auteur_id);
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notif_pubof on publications_officielles;
create trigger trg_notif_pubof after insert on publications_officielles
  for each row execute function notifier_publication();

create or replace function notifier_sondage() returns trigger as $$
begin
  perform notifier_secteur(new.geo, 'sondage', new.question,
    new.precisions, '/sondages/' || new.id, new.auteur_id);
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notif_sondage on sondages;
create trigger trg_notif_sondage after insert on sondages
  for each row execute function notifier_sondage();

create or replace function notifications_non_lues() returns int as $$
  select count(*)::int from notifications
   where profil_id = auth.uid() and lu_le is null;
$$ language sql stable security definer set search_path = public;

create or replace function marquer_notifications_lues() returns void as $$
  update notifications set lu_le = now()
   where profil_id = auth.uid() and lu_le is null;
$$ language sql security definer set search_path = public;

-- ── Lecture des publications et sondages, soumise au rayon ──
create or replace function publications_officielles_autour(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_limite int default 20
)
returns table (
  id uuid, categorie text, titre text, texte text, photos text[], lien text,
  epinglee boolean, created_at timestamptz, distance_km numeric,
  auteur_id uuid, auteur_nom text, auteur_type text, auteur_verifiee boolean,
  auteur_avatar text
) as $$
  select p.id, p.categorie, p.titre, p.texte, p.photos, p.lien,
         p.epinglee, p.created_at,
         round((st_distance(p.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
         pr.id, coalesce(pr.organisation_nom, pr.prenom), pr.organisation,
         pr.organisation_verifiee, pr.avatar_url
    from publications_officielles p
    join profils pr on pr.id = p.auteur_id
   where (p.expire_le is null or p.expire_le > now())
     and st_dwithin(p.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
   order by p.epinglee desc, p.created_at desc
   limit p_limite;
$$ language sql stable security definer set search_path = public;

create or replace function sondages_autour(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_limite int default 20
)
returns table (
  id uuid, question text, precisions text, choix_multiple boolean,
  clos_le timestamptz, created_at timestamptz, distance_km numeric,
  auteur_id uuid, auteur_nom text, auteur_type text, auteur_verifiee boolean,
  nb_votants int, a_vote boolean
) as $$
  select s.id, s.question, s.precisions, s.choix_multiple,
         s.clos_le, s.created_at,
         round((st_distance(s.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
         pr.id, coalesce(pr.organisation_nom, pr.prenom), pr.organisation,
         pr.organisation_verifiee,
         (select count(distinct v.profil_id)::int from sondage_votes v where v.sondage_id = s.id),
         exists (select 1 from sondage_votes v
                  where v.sondage_id = s.id and v.profil_id = auth.uid())
    from sondages s
    join profils pr on pr.id = s.auteur_id
   where st_dwithin(s.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
   order by (s.clos_le is null or s.clos_le > now()) desc, s.created_at desc
   limit p_limite;
$$ language sql stable security definer set search_path = public;

/**
 * Résultats d'un sondage, en temps réel.
 * Les totaux sont publics, les votes individuels ne le sont pas :
 * la fonction ne renvoie que des nombres, plus le choix du lecteur.
 */
create or replace function resultats_sondage(p_sondage uuid)
returns table (
  option_id uuid, libelle text, rang int, voix int, mon_choix boolean
) as $$
  select o.id, o.libelle, o.position,
         (select count(*)::int from sondage_votes v where v.option_id = o.id),
         exists (select 1 from sondage_votes v
                  where v.option_id = o.id and v.profil_id = auth.uid())
    from sondage_options o
   where o.sondage_id = p_sondage
   order by o.position;
$$ language sql stable security definer set search_path = public;

/**
 * Enregistre un vote. Remplace le précédent si le sondage n'accepte
 * qu'un choix : on change d'avis, on ne cumule pas.
 */
create or replace function voter_sondage(p_sondage uuid, p_options uuid[])
returns void as $$
declare v_moi uuid := auth.uid(); v_multiple boolean; v_clos timestamptz;
begin
  if v_moi is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;

  select choix_multiple, clos_le into v_multiple, v_clos
    from public.sondages where id = p_sondage;
  if v_multiple is null then
    raise exception 'Sondage introuvable.' using errcode = 'check_violation';
  end if;
  if v_clos is not null and v_clos <= now() then
    raise exception 'Ce sondage est clos.' using errcode = 'check_violation';
  end if;
  if array_length(p_options, 1) is null then
    raise exception 'Choisissez au moins une réponse.' using errcode = 'check_violation';
  end if;
  if not v_multiple and array_length(p_options, 1) > 1 then
    raise exception 'Ce sondage n''accepte qu''une réponse.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(p_options) o
              where o not in (select id from public.sondage_options
                               where sondage_id = p_sondage)) then
    raise exception 'Réponse inconnue.' using errcode = 'check_violation';
  end if;

  delete from public.sondage_votes where sondage_id = p_sondage and profil_id = v_moi;
  insert into public.sondage_votes (sondage_id, option_id, profil_id)
    select p_sondage, o, v_moi from unnest(p_options) o;
end $$ language plpgsql security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  VALIDATION DES COMPTES
--  Tant que le service est en construction, aucune inscription n'est
--  active avant d'avoir été approuvée par la modération. Un compte en
--  attente peut consulter, pas publier ni commander.
-- ═══════════════════════════════════════════════════════════════
alter table profils add column if not exists compte_valide boolean default false not null;
alter table profils add column if not exists valide_le timestamptz;
alter table profils add column if not exists valide_par uuid references profils(id) on delete set null;
alter table profils add column if not exists refus_motif text;

grant select (compte_valide, valide_le, refus_motif) on profils to anon, authenticated;
-- Ni compte_valide ni valide_par ne sont ouverts en écriture au membre.

create or replace function compte_actif(p_profil uuid default null) returns boolean as $$
  select coalesce((select compte_valide from public.profils
                    where id = coalesce(p_profil, auth.uid())), false);
$$ language sql stable security definer set search_path = public;

-- Les comptes existants sont validés : ce sont ceux d'avant la règle.
update profils set compte_valide = true, valide_le = coalesce(valide_le, now())
 where compte_valide = false;

-- ── Publier et vendre supposent un compte validé ──
drop policy if exists creation_annonce on annonces;
create policy creation_annonce on annonces for insert
  with check (vendeur_id = auth.uid() and compte_actif());

drop policy if exists creation_evenement on evenements;
create policy creation_evenement on evenements for insert
  with check (auteur_id = auth.uid() and compte_actif());

drop policy if exists creation_pubof on publications_officielles;
create policy creation_pubof on publications_officielles for insert
  with check (auteur_id = auth.uid() and est_organisation() and compte_actif());

drop policy if exists creation_sondage on sondages;
create policy creation_sondage on sondages for insert
  with check (auteur_id = auth.uid() and est_organisation() and compte_actif());

-- ── Demandes de statut d'organisation ──
create table if not exists demandes_organisation (
  id            uuid primary key default uuid_generate_v4(),
  profil_id     uuid references profils(id) on delete cascade not null,
  type          text not null check (type in ('mairie', 'association', 'collectif')),
  nom           text not null check (length(trim(nom)) between 2 and 140),
  email_officiel text not null,
  fonction      text,
  telephone     text,
  site_officiel text,
  justification text,
  statut        text not null default 'en_attente',  -- en_attente | acceptee | refusee
  motif_reponse text,
  traite_par    uuid references profils(id) on delete set null,
  traite_le     timestamptz,
  created_at    timestamptz default now()
);
create index if not exists idx_demandes_org on demandes_organisation (statut, created_at desc);

alter table demandes_organisation enable row level security;
drop policy if exists lecture_demande_org on demandes_organisation;
create policy lecture_demande_org on demandes_organisation for select
  using (profil_id = auth.uid() or est_moderateur());
drop policy if exists creation_demande_org on demandes_organisation;
create policy creation_demande_org on demandes_organisation for insert
  with check (profil_id = auth.uid());
-- La réponse passe par repondre_demande_organisation().

/**
 * Réponse de la modération à une demande d'organisation.
 * L'acceptation pose le statut et la vérification en une fois : c'est
 * la même décision, elle ne doit pas pouvoir se faire à moitié.
 */
create or replace function repondre_demande_organisation(
  p_demande uuid, p_accepte boolean, p_motif text default null
) returns void as $$
declare v_d record;
begin
  if not est_moderateur() then
    raise exception 'Action réservée à la modération.' using errcode = 'check_violation';
  end if;

  select * into v_d from public.demandes_organisation where id = p_demande;
  if v_d.id is null then
    raise exception 'Demande introuvable.' using errcode = 'check_violation';
  end if;
  if v_d.statut <> 'en_attente' then
    raise exception 'Cette demande a déjà été traitée.' using errcode = 'check_violation';
  end if;
  if not p_accepte and coalesce(length(trim(p_motif)), 0) < 3 then
    raise exception 'Un motif de refus est obligatoire.' using errcode = 'check_violation';
  end if;

  update public.demandes_organisation
     set statut = case when p_accepte then 'acceptee' else 'refusee' end,
         motif_reponse = nullif(trim(coalesce(p_motif, '')), ''),
         traite_par = auth.uid(), traite_le = now()
   where id = p_demande;

  if p_accepte then
    update public.profils
       set organisation = v_d.type, organisation_nom = v_d.nom,
           organisation_verifiee = true, updated_at = now()
     where id = v_d.profil_id;
  end if;

  insert into public.notifications (profil_id, categorie, titre, apercu, lien, auteur_nom)
    values (v_d.profil_id, 'compte',
      case when p_accepte then 'Votre structure est vérifiée'
           else 'Votre demande n''a pas été retenue' end,
      case when p_accepte then v_d.nom || ' peut désormais publier des informations.'
           else coalesce(p_motif, '') end,
      '/officiel', 'Modération');
end $$ language plpgsql security definer set search_path = public;

/**
 * Validation d'une inscription par la modération.
 * Sans elle, le compte peut regarder mais ne peut rien publier.
 */
create or replace function valider_compte(
  p_profil uuid, p_accepte boolean, p_motif text default null
) returns void as $$
begin
  if not est_moderateur() then
    raise exception 'Action réservée à la modération.' using errcode = 'check_violation';
  end if;
  if not p_accepte and coalesce(length(trim(p_motif)), 0) < 3 then
    raise exception 'Un motif de refus est obligatoire.' using errcode = 'check_violation';
  end if;

  update public.profils
     set compte_valide = p_accepte,
         valide_le = case when p_accepte then now() else null end,
         valide_par = auth.uid(),
         refus_motif = case when p_accepte then null else trim(p_motif) end,
         updated_at = now()
   where id = p_profil;

  insert into public.notifications (profil_id, categorie, titre, apercu, lien, auteur_nom)
    values (p_profil, 'compte',
      case when p_accepte then 'Votre compte est activé'
           else 'Votre inscription n''a pas été retenue' end,
      case when p_accepte then 'Vous pouvez publier, acheter et vendre.'
           else coalesce(p_motif, '') end,
      '/profil', 'Modération');
end $$ language plpgsql security definer set search_path = public;

/** Comptes et demandes en attente, pour l'écran de modération. */
create or replace function file_moderation()
returns table (
  genre text, id uuid, profil_id uuid, prenom text, email text,
  detail text, secteur text, created_at timestamptz
) as $$
  select 'compte', p.id, p.id, p.prenom, u.email::text,
         case p.role when 'pro' then 'Producteur professionnel'
                     when 'amateur' then 'Jardinier amateur'
                     else 'Acheteur' end,
         s.nom, p.created_at
    from profils p
    join auth.users u on u.id = p.id
    left join secteurs s on s.code_insee = p.secteur
   where est_moderateur() and p.compte_valide = false and p.refus_motif is null
  union all
  select 'organisation', d.id, d.profil_id, p.prenom, d.email_officiel,
         d.type || ' · ' || d.nom || coalesce(' · ' || d.fonction, ''),
         s.nom, d.created_at
    from demandes_organisation d
    join profils p on p.id = d.profil_id
    left join secteurs s on s.code_insee = p.secteur
   where est_moderateur() and d.statut = 'en_attente'
   order by 8;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  MODÉRATION DES PROFILS
--  La modération corrige un profil comme elle corrige une annonce :
--  un prénom insultant, une présentation déplacée, une commune
--  manifestement fausse. Les colonnes sensibles restent hors de
--  portée : solde de points, vérification, droits.
-- ═══════════════════════════════════════════════════════════════
drop policy if exists maj_profil on profils;
create policy maj_profil on profils for update
  using (auth.uid() = id or est_moderateur());

/**
 * Statuts qu'un membre ne peut pas s'accorder : vérification
 * professionnelle et vérification de structure.
 */
create or replace function moderer_statuts_profil(
  p_profil uuid, p_pro_verifie boolean, p_organisation_verifiee boolean, p_motif text
) returns void as $$
begin
  if not est_moderateur() then
    raise exception 'Action réservée à la modération.' using errcode = 'check_violation';
  end if;
  if coalesce(length(trim(p_motif)), 0) < 3 then
    raise exception 'Un motif est obligatoire.' using errcode = 'check_violation';
  end if;

  update public.profils
     set pro_verifie = coalesce(p_pro_verifie, pro_verifie),
         organisation_verifiee = coalesce(p_organisation_verifiee, organisation_verifiee),
         updated_at = now()
   where id = p_profil;

  insert into public.journal_moderation
    (moderateur_id, annonce_id, titre, vendeur_id, action, motif)
    values (auth.uid(), null,
      'Profil : ' || (select prenom from public.profils where id = p_profil),
      p_profil, 'corrigee', trim(p_motif));
end $$ language plpgsql security definer set search_path = public;

/** Fiche complète d'un membre, pour l'écran de modération. */
create or replace function profil_pour_moderation(p_profil uuid)
returns setof profils as $$
  select * from public.profils where est_moderateur() and id = p_profil;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  ACCUSÉS DE RÉCEPTION
--  Un message passe par trois états : envoyé, remis quand le
--  destinataire a reçu le fil sur son appareil, lu quand il a ouvert
--  la conversation.
-- ═══════════════════════════════════════════════════════════════
alter table messages_prives add column if not exists remis_le timestamptz;

/** Marque comme remis tout ce qui attend le membre connecté. */
create or replace function marquer_remis()
returns int as $$
declare v_n int;
begin
  update public.messages_prives m set remis_le = now()
    from public.conversations c
   where c.id = m.conversation_id
     and auth.uid() in (c.membre_min, c.membre_max)
     and m.auteur_id <> auth.uid()
     and m.remis_le is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$ language plpgsql security definer set search_path = public;

-- La lecture vaut remise : on ne peut pas lire sans avoir reçu.
create or replace function marquer_lus(p_conversation uuid)
returns void as $$
  update messages_prives m set lu_le = now(), remis_le = coalesce(m.remis_le, now())
    from conversations c
   where c.id = m.conversation_id
     and m.conversation_id = p_conversation
     and auth.uid() in (c.membre_min, c.membre_max)
     and m.auteur_id <> auth.uid()
     and m.lu_le is null;
$$ language sql security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  NOUVEAUTÉS DU SECTEUR
--  De quoi alimenter les avis affichés en direct : nouveaux
--  messages, informations, et annonces susceptibles d'intéresser.
--  Les suggestions reposent sur ce que la personne a déjà acheté ou
--  publié, jamais sur des données qu'elle n'a pas fournies.
-- ═══════════════════════════════════════════════════════════════
create or replace function nouveautes(p_depuis timestamptz)
returns table (
  genre text, id uuid, titre text, apercu text, lien text, quand timestamptz
) as $$
  with moi as (
    select p.id, p.rayon_km, s.lat, s.lon
      from profils p join secteurs s on s.code_insee = p.secteur
     where p.id = auth.uid()
  ),
  -- Ce qui intéresse : les produits déjà achetés ou déjà publiés.
  gouts as (
    select distinct l.titre as libelle
      from lignes_commande l join commandes c on c.id = l.commande_id
     where c.acheteur_id = auth.uid()
    union
    select distinct a.titre from annonces a where a.vendeur_id = auth.uid()
  )
  select 'message', m.id, coalesce(pr.raison_sociale, pr.prenom),
         left(m.texte, 120), '/messages/' || c.id, m.created_at
    from messages_prives m
    join conversations c on c.id = m.conversation_id
    join profils pr on pr.id = m.auteur_id
   where auth.uid() in (c.membre_min, c.membre_max)
     and m.auteur_id <> auth.uid() and m.created_at > p_depuis
  union all
  select 'info', n.id, n.titre, n.apercu, n.lien, n.created_at
    from notifications n
   where n.profil_id = auth.uid() and n.created_at > p_depuis
  union all
  select 'annonce', a.id,
         a.titre || coalesce(' — ' || v.nom, ''),
         coalesce(pr.raison_sociale, pr.prenom) || ' · ' || a.commune,
         '/annonce/' || a.id, a.created_at
    from annonces a
    join profils pr on pr.id = a.vendeur_id
    left join varietes v on v.id = a.variete_id
    cross join moi
   where a.created_at > p_depuis
     and a.vendeur_id <> auth.uid()
     and a.statut = 'en_ligne' and a.quantite > 0
     and st_dwithin(a.geo, st_point(moi.lon, moi.lat)::geography, moi.rayon_km * 1000)
     and (exists (select 1 from gouts g where g.libelle = a.titre)
          or a.est_lot)
   order by 6 desc
   limit 12;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  LA BATAILLE DES VOISINS
--  Un classement d'activité, et non de points : publier, vendre,
--  acheter, tenir un relais, organiser, discuter. Les points servent
--  aux bons d'achat, ils n'ont pas à mesurer qui anime le secteur.
-- ═══════════════════════════════════════════════════════════════
create or replace function bataille_voisins(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_jours int default 90, p_limite int default 10
)
returns table (
  id uuid, prenom text, avatar_url text, role text, est_relais boolean,
  commune text, nb_annonces int, nb_ventes int, nb_achats int,
  nb_evenements int, nb_messages int, nb_publications int, score int
) as $$
  with periode as (select (now() - (p_jours || ' days')::interval) as debut),
  gens as (
    select p.id, coalesce(p.raison_sociale, p.organisation_nom, p.prenom) as nom,
           p.avatar_url, p.role::text, p.est_relais, s.nom as commune
      from profils p
      join secteurs s on s.code_insee = p.secteur
     where st_dwithin(st_point(s.lon, s.lat)::geography,
                      st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
  )
  select g.id, g.nom, g.avatar_url, g.role, g.est_relais, g.commune,
         a.n, v.n, ac.n, e.n, m.n, pu.n,
         -- Chaque geste compte, les plus engageants comptent davantage.
         (a.n * 3 + v.n * 6 + ac.n * 4 + e.n * 8 + m.n + pu.n * 5
          + case when g.est_relais then 10 else 0 end)::int
    from gens g, periode pe,
    lateral (select count(*)::int n from annonces x
              where x.vendeur_id = g.id and x.created_at > pe.debut) a,
    lateral (select count(*)::int n from lignes_commande x
              where x.vendeur_id = g.id and x.verse and x.verse_le > pe.debut) v,
    lateral (select count(*)::int n from commandes x
              where x.acheteur_id = g.id and x.statut = 'retiree'
                and x.retire_le > pe.debut) ac,
    lateral (select count(*)::int n from evenements x
              where x.auteur_id = g.id and x.created_at > pe.debut) e,
    lateral (select count(*)::int n from messages_prives x
              where x.auteur_id = g.id and x.created_at > pe.debut) m,
    lateral (select count(*)::int n from publications_officielles x
              where x.auteur_id = g.id and x.created_at > pe.debut) pu
   where (a.n + v.n + ac.n + e.n + m.n + pu.n) > 0 or g.est_relais
   order by 13 desc, g.nom
   limit p_limite;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  LE BISTROT DU COIN
--  Un lieu de discussion par thème : conseils de culture, entraide,
--  bons plans, ce qui se passe au village. Soumis au rayon comme le
--  reste : on discute avec ses voisins, pas avec la France entière.
-- ═══════════════════════════════════════════════════════════════
create table if not exists sujets (
  id           uuid primary key default uuid_generate_v4(),
  auteur_id    uuid references profils(id) on delete cascade not null,
  secteur      text references secteurs(code_insee) not null,
  theme        text not null default 'discussion',
  -- conseils | entraide | bons_plans | vie_locale | recettes | discussion
  titre        text not null check (length(trim(titre)) between 3 and 160),
  texte        text not null check (length(trim(texte)) between 3 and 4000),
  photos       text[] default '{}',
  epingle      boolean default false not null,
  ferme        boolean default false not null,
  dernier_le   timestamptz default now() not null,
  lat          double precision,
  lon          double precision,
  geo          geography(point, 4326),
  created_at   timestamptz default now()
);
create index if not exists idx_sujets_geo on sujets using gist (geo);
create index if not exists idx_sujets_date on sujets (dernier_le desc);

create table if not exists reponses_sujet (
  id         uuid primary key default uuid_generate_v4(),
  sujet_id   uuid references sujets(id) on delete cascade not null,
  auteur_id  uuid references profils(id) on delete cascade not null,
  texte      text not null check (length(trim(texte)) between 1 and 3000),
  photos     text[] default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_reponses_sujet on reponses_sujet (sujet_id, created_at);

create or replace function geo_sujet() returns trigger as $$
begin
  if new.lat is null or new.lon is null then
    select s.lat, s.lon into new.lat, new.lon
      from public.secteurs s where s.code_insee = new.secteur;
  end if;
  new.geo := st_point(new.lon, new.lat)::geography;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_geo_sujet on sujets;
create trigger trg_geo_sujet before insert or update on sujets
  for each row execute function geo_sujet();

create or replace function toucher_sujet() returns trigger as $$
begin
  update public.sujets set dernier_le = now() where id = new.sujet_id;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_toucher_sujet on reponses_sujet;
create trigger trg_toucher_sujet after insert on reponses_sujet
  for each row execute function toucher_sujet();

alter table sujets enable row level security;
alter table reponses_sujet enable row level security;

drop policy if exists lecture_sujets on sujets;
create policy lecture_sujets on sujets for select using (true);
drop policy if exists creation_sujet on sujets;
create policy creation_sujet on sujets for insert
  with check (auteur_id = auth.uid() and compte_actif());
drop policy if exists maj_sujet on sujets;
create policy maj_sujet on sujets for update
  using (auteur_id = auth.uid() or est_moderateur());
drop policy if exists suppr_sujet on sujets;
create policy suppr_sujet on sujets for delete
  using (auteur_id = auth.uid() or est_moderateur());

drop policy if exists lecture_reponses on reponses_sujet;
create policy lecture_reponses on reponses_sujet for select using (true);
drop policy if exists creation_reponse on reponses_sujet;
create policy creation_reponse on reponses_sujet for insert
  with check (auteur_id = auth.uid() and compte_actif()
    and exists (select 1 from sujets s where s.id = sujet_id and s.ferme = false));
drop policy if exists maj_reponse on reponses_sujet;
create policy maj_reponse on reponses_sujet for update using (auteur_id = auth.uid());
drop policy if exists suppr_reponse on reponses_sujet;
create policy suppr_reponse on reponses_sujet for delete
  using (auteur_id = auth.uid() or est_moderateur());

/** Sujets du rayon, du plus vivant au plus ancien. */
create or replace function sujets_autour(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_theme text default null, p_limite int default 30
)
returns table (
  id uuid, theme text, titre text, texte text, photos text[],
  epingle boolean, ferme boolean, dernier_le timestamptz, created_at timestamptz,
  distance_km numeric, auteur_id uuid, auteur_prenom text, auteur_avatar text,
  auteur_role text, nb_reponses int, dernier_prenom text
) as $$
  select s.id, s.theme, s.titre, s.texte, s.photos,
         s.epingle, s.ferme, s.dernier_le, s.created_at,
         round((st_distance(s.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
         pr.id, coalesce(pr.raison_sociale, pr.organisation_nom, pr.prenom), pr.avatar_url,
         pr.role::text,
         (select count(*)::int from reponses_sujet r where r.sujet_id = s.id),
         (select coalesce(p2.raison_sociale, p2.organisation_nom, p2.prenom)
            from reponses_sujet r join profils p2 on p2.id = r.auteur_id
           where r.sujet_id = s.id order by r.created_at desc limit 1)
    from sujets s
    join profils pr on pr.id = s.auteur_id
   where st_dwithin(s.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
     and (p_theme is null or s.theme = p_theme)
   order by s.epingle desc, s.dernier_le desc
   limit p_limite;
$$ language sql stable security definer set search_path = public;

/** Réponses d'un sujet, avec leurs auteurs. */
create or replace function reponses_de(p_sujet uuid)
returns table (
  id uuid, texte text, photos text[], created_at timestamptz,
  auteur_id uuid, auteur_prenom text, auteur_avatar text, auteur_role text
) as $$
  select r.id, r.texte, r.photos, r.created_at,
         pr.id, coalesce(pr.raison_sociale, pr.organisation_nom, pr.prenom),
         pr.avatar_url, pr.role::text
    from reponses_sujet r
    join profils pr on pr.id = r.auteur_id
   where r.sujet_id = p_sujet
   order by r.created_at;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  COMMENTAIRES
--  Sous une annonce, un événement ou une information : c'est là que
--  le village se parle. Une seule table pour les trois, avec le type
--  de cible, plutôt que trois tables identiques à maintenir.
-- ═══════════════════════════════════════════════════════════════
/** Qui a publié la chose commentée. */
create or replace function proprietaire_cible(p_type text, p_id uuid)
returns uuid as $$
  select case p_type
    when 'annonce' then (select vendeur_id from public.annonces where id = p_id)
    when 'evenement' then (select auteur_id from public.evenements where id = p_id)
    when 'information' then (select auteur_id from public.publications_officielles where id = p_id)
  end;
$$ language sql stable security definer set search_path = public;

create table if not exists commentaires (
  id          uuid primary key default uuid_generate_v4(),
  cible_type  text not null check (cible_type in ('annonce', 'evenement', 'information')),
  cible_id    uuid not null,
  auteur_id   uuid references profils(id) on delete cascade not null,
  parent_id   uuid references commentaires(id) on delete cascade,
  texte       text not null check (length(trim(texte)) between 1 and 2000),
  masque      boolean default false not null,
  masque_par  uuid references profils(id) on delete set null,
  masque_motif text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_comm_cible on commentaires (cible_type, cible_id, created_at);

alter table commentaires enable row level security;

-- On lit tout, y compris ce qui est masqué : l'affichage remplace le
-- texte par une mention, sans faire disparaître le fil de la discussion.
drop policy if exists lecture_commentaires on commentaires;
create policy lecture_commentaires on commentaires for select using (true);

drop policy if exists creation_commentaire on commentaires;
create policy creation_commentaire on commentaires for insert
  with check (auteur_id = auth.uid() and compte_actif());

drop policy if exists maj_commentaire on commentaires;
create policy maj_commentaire on commentaires for update using (auteur_id = auth.uid());

-- La suppression appartient à l'auteur du commentaire, à celui de
-- l'annonce commentée, et à la modération.
drop policy if exists suppr_commentaire on commentaires;
create policy suppr_commentaire on commentaires for delete
  using (auteur_id = auth.uid() or est_moderateur()
    or auth.uid() = proprietaire_cible(cible_type, cible_id));

/**
 * Masque un commentaire sans l'effacer.
 * Le fil garde sa trace : une réponse à un message disparu devient
 * incompréhensible, et masquer en silence n'est pas loyal.
 */
create or replace function masquer_commentaire(
  p_commentaire uuid, p_masque boolean, p_motif text default null
) returns void as $$
declare v_c record;
begin
  select c.*, proprietaire_cible(c.cible_type, c.cible_id) as proprio
    into v_c from public.commentaires c where c.id = p_commentaire;
  if v_c.id is null then
    raise exception 'Commentaire introuvable.' using errcode = 'check_violation';
  end if;
  if not (est_moderateur() or auth.uid() = v_c.proprio) then
    raise exception 'Vous ne pouvez pas modérer ce commentaire.' using errcode = 'check_violation';
  end if;
  if p_masque and coalesce(length(trim(p_motif)), 0) < 3 then
    raise exception 'Un motif est obligatoire.' using errcode = 'check_violation';
  end if;

  update public.commentaires
     set masque = p_masque,
         masque_par = case when p_masque then auth.uid() end,
         masque_motif = case when p_masque then trim(p_motif) end,
         updated_at = now()
   where id = p_commentaire;
end $$ language plpgsql security definer set search_path = public;

/** Fil de commentaires d'une cible, avec ses auteurs. */
create or replace function commentaires_de(p_type text, p_id uuid)
returns table (
  id uuid, parent_id uuid, texte text, masque boolean, masque_motif text,
  created_at timestamptz, auteur_id uuid, auteur_prenom text,
  auteur_avatar text, auteur_role text, est_proprietaire boolean
) as $$
  select c.id, c.parent_id, c.texte, c.masque, c.masque_motif, c.created_at,
         pr.id, coalesce(pr.raison_sociale, pr.organisation_nom, pr.prenom),
         pr.avatar_url, pr.role::text,
         pr.id = proprietaire_cible(p_type, p_id)
    from commentaires c
    join profils pr on pr.id = c.auteur_id
   where c.cible_type = p_type and c.cible_id = p_id
   order by coalesce(c.parent_id, c.id), c.created_at;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  UNE SEULE CONVERSATION PAR PERSONNE
--  Rattacher le fil à une annonce créait un fil par produit : on se
--  retrouvait avec trois discussions avec le même voisin. Le produit
--  descend au niveau du message, où il a sa place : on parle d'un
--  produit dans un message, pas dans une relation.
-- ═══════════════════════════════════════════════════════════════
alter table messages_prives add column if not exists annonce_id uuid
  references annonces(id) on delete set null;

-- Fusion des fils en double : tout remonte dans le plus ancien.
do $$
declare v record;
begin
  for v in
    select membre_min, membre_max, min(created_at) as debut
      from conversations group by membre_min, membre_max having count(*) > 1
  loop
    update messages_prives m
       set conversation_id = (select id from conversations c
                               where c.membre_min = v.membre_min
                                 and c.membre_max = v.membre_max
                                 and c.created_at = v.debut limit 1),
           annonce_id = coalesce(m.annonce_id,
             (select c.annonce_id from conversations c where c.id = m.conversation_id))
     where m.conversation_id in (select id from conversations c
                                  where c.membre_min = v.membre_min
                                    and c.membre_max = v.membre_max
                                    and c.created_at <> v.debut);

    delete from conversations c
     where c.membre_min = v.membre_min and c.membre_max = v.membre_max
       and c.created_at <> v.debut;
  end loop;
end $$;

drop index if exists idx_conv_unique;
create unique index if not exists idx_conv_paire on conversations (membre_min, membre_max);

/** Ouvre le fil avec ce voisin, ou retrouve celui qui existe déjà. */
create or replace function ouvrir_conversation(p_destinataire uuid, p_annonce uuid default null)
returns uuid as $$
declare
  v_moi uuid := auth.uid();
  v_min uuid; v_max uuid; v_conv uuid; v_km numeric;
begin
  if v_moi is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;
  if p_destinataire = v_moi then
    raise exception 'On ne s''écrit pas à soi-même.' using errcode = 'check_violation';
  end if;

  select round((st_distance(sa.geo_pt, sb.geo_pt) / 1000)::numeric, 1) into v_km
    from (select st_point(s.lon, s.lat)::geography as geo_pt
            from profils p join secteurs s on s.code_insee = p.secteur
           where p.id = v_moi) sa,
         (select st_point(s.lon, s.lat)::geography as geo_pt
            from profils p join secteurs s on s.code_insee = p.secteur
           where p.id = p_destinataire) sb;

  if v_km is null or v_km > (select rayon_km from profils where id = v_moi) then
    raise exception 'Ce membre est hors de votre rayon.' using errcode = 'check_violation';
  end if;

  v_min := least(v_moi, p_destinataire);
  v_max := greatest(v_moi, p_destinataire);

  select id into v_conv from conversations
   where membre_min = v_min and membre_max = v_max;
  if v_conv is not null then return v_conv; end if;

  insert into conversations (membre_min, membre_max) values (v_min, v_max)
    returning id into v_conv;
  return v_conv;
end $$ language plpgsql security definer set search_path = public;

/** Annonces en ligne d'un membre, pour le sélecteur de la messagerie. */
create or replace function annonces_du_membre(p_membre uuid)
returns table (id uuid, titre text, variete text, prix numeric, unite text, mode text) as $$
  select a.id, a.titre, coalesce(v.nom, a.variete_libre), a.prix, a.unite, a.mode::text
    from annonces a
    left join varietes v on v.id = a.variete_id
   where a.vendeur_id = p_membre and a.statut = 'en_ligne' and a.quantite > 0
   order by a.created_at desc
   limit 40;
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  POINTS SUSPENDUS SUR LES ACHATS
--  Les achats ne rapportent plus de points pour le moment. Seul le
--  service rendu en point relais en donne encore : c'est un dédommagement,
--  pas une récompense d'achat.
-- ═══════════════════════════════════════════════════════════════
create or replace function crediter_retrait(p_commande uuid)
returns int as $$
declare
  v_profil uuid := auth.uid();
  v_cmd record;
begin
  if v_profil is null then
    raise exception 'Connexion requise.' using errcode = 'check_violation';
  end if;

  select id, acheteur_id, statut, mode_retrait, relais_id, reference
    into v_cmd from public.commandes where id = p_commande;

  if v_cmd.id is null or v_cmd.acheteur_id <> v_profil then
    raise exception 'Commande introuvable.' using errcode = 'check_violation';
  end if;
  if v_cmd.statut <> 'retiree' then
    raise exception 'Le retrait n''est pas confirmé.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.mouvements_points
              where commande_id = p_commande and montant > 0) then
    return 0;
  end if;

  -- L'hôte du point relais reste dédommagé du service rendu.
  if v_cmd.mode_retrait = 'relais' and v_cmd.relais_id is not null
     and v_cmd.relais_id <> v_profil then
    perform public.ajouter_points(v_cmd.relais_id, 20,
      'Colis remis en point relais — ' || v_cmd.reference, p_commande);
  end if;

  return 0;
end $$ language plpgsql security definer set search_path = public;

-- ═══════════════════════════════════════════════════════════════
--  VOTANTS VISIBLES, AU CHOIX DE L'AUTEUR
--  Un sondage peut être à main levée : on voit alors qui a voté quoi.
--  Le choix se fait à la création et ne se change plus : dévoiler
--  après coup des votes donnés sous promesse d'anonymat serait une
--  trahison. Les sondages existants restent anonymes.
-- ═══════════════════════════════════════════════════════════════
alter table sondages alter column anonyme set default true;
update sondages set anonyme = true where anonyme is null;

-- Le passage d'un sondage de public à anonyme reste possible (on peut
-- toujours en promettre plus), l'inverse non.
create or replace function verrou_anonymat() returns trigger as $$
begin
  if old.anonyme = true and new.anonyme = false then
    raise exception 'Un sondage anonyme ne peut pas devenir public.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_anonymat on sondages;
create trigger trg_anonymat before update on sondages
  for each row execute function verrou_anonymat();

/**
 * Qui a voté quoi, uniquement sur un sondage à main levée.
 * Sur un sondage anonyme, la fonction ne renvoie rien du tout.
 */
create or replace function votants_sondage(p_sondage uuid)
returns table (
  option_id uuid, profil_id uuid, prenom text, avatar_url text, role text
) as $$
  select v.option_id, p.id,
         coalesce(p.raison_sociale, p.organisation_nom, p.prenom),
         p.avatar_url, p.role::text
    from sondage_votes v
    join profils p on p.id = v.profil_id
   where v.sondage_id = p_sondage
     and exists (select 1 from sondages s
                  where s.id = p_sondage and s.anonyme = false)
   order by v.created_at;
$$ language sql stable security definer set search_path = public;

-- La liste des sondages indique s'ils sont à main levée.
drop function if exists sondages_autour(double precision, double precision, int, int);
create or replace function sondages_autour(
  p_lat double precision, p_lon double precision,
  p_rayon_km int default 20, p_limite int default 20
)
returns table (
  id uuid, question text, precisions text, choix_multiple boolean,
  clos_le timestamptz, created_at timestamptz, distance_km numeric,
  auteur_id uuid, auteur_nom text, auteur_type text, auteur_verifiee boolean,
  nb_votants int, a_vote boolean, anonyme boolean
) as $$
  select s.id, s.question, s.precisions, s.choix_multiple,
         s.clos_le, s.created_at,
         round((st_distance(s.geo, st_point(p_lon, p_lat)::geography) / 1000)::numeric, 1),
         pr.id, coalesce(pr.organisation_nom, pr.prenom), pr.organisation,
         pr.organisation_verifiee,
         (select count(distinct v.profil_id)::int from sondage_votes v where v.sondage_id = s.id),
         exists (select 1 from sondage_votes v
                  where v.sondage_id = s.id and v.profil_id = auth.uid()),
         s.anonyme
    from sondages s
    join profils pr on pr.id = s.auteur_id
   where st_dwithin(s.geo, st_point(p_lon, p_lat)::geography, p_rayon_km * 1000)
   order by (s.clos_le is null or s.clos_le > now()) desc, s.created_at desc
   limit p_limite;
$$ language sql stable security definer set search_path = public;
