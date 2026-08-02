export type Role = 'acheteur' | 'amateur' | 'pro';
export type ModeTransaction = 'vente' | 'troc' | 'don';

export interface Secteur {
  code_insee: string;
  nom: string;
  code_postal: string | null;
  departement: string;
  region: string | null;
  population: number;
  lat: number;
  lon: number;
  membres: number;
  attente: number;
  ouvert: boolean;
}

export interface Profil {
  id: string;
  prenom: string;
  nom: string | null;
  telephone: string | null;
  bio: string | null;
  raison_sociale: string | null;
  role: Role;
  secteur: string | null;
  rayon_km: number;
  points: number;
  avatar_url: string | null;
  pro_verifie: boolean;
  est_relais: boolean;
}

export interface Produit {
  id: number;
  cle: string;
  nom: string;
  categorie: string;
  unite: string;
  prix_ref: number | null;
  transforme: boolean;
  mois_saison: number[];
  illustration: string | null;
}

export interface Variete {
  id: number;
  produit_id: number;
  nom: string;
  description: string | null;
  illustration: string | null;
}

/** Résultat de la fonction SQL annonces_autour(). */
export interface AnnonceProche {
  id: string;
  titre: string;
  description: string | null;
  mode: ModeTransaction;
  prix: number;
  unite: string;
  quantite: number;
  commune: string;
  photos: string[];
  categorie: string | null;
  produit: string | null;
  variete: string | null;
  prix_ref: number | null;
  distance_km: number;
  vendeur_prenom: string;
  vendeur_pro: boolean;
  vendeur_id: string;
  vendeur_avatar: string | null;
  illustration: string | null;
  est_lot?: boolean;
  nb_composants?: number;
  created_at: string;
}

export interface LignePanier {
  annonce_id: string;
  titre: string;
  variete: string | null;
  photo: string | null;
  mode: ModeTransaction;
  prix: number;
  unite: string;
  quantite: number;
  stock: number;
  vendeur_id: string;
  vendeur_prenom: string;
  commune: string;
  prix_ref: number | null;
}

export type TypeEvenement = 'marche' | 'fete' | 'brocante' | 'porte_ouverte' | 'autre';

export interface EvenementProche {
  id: string;
  titre: string;
  description: string | null;
  type: TypeEvenement;
  debut: string;
  fin: string | null;
  lieu: string | null;
  commune: string;
  photos: string[];
  distance_km: number;
  auteur_prenom: string;
  auteur_id: string;
  nb_oui: number;
}

export interface ProducteurProche {
  id: string;
  prenom: string;
  raison_sociale: string | null;
  bio: string | null;
  avatar_url: string | null;
  pro_verifie: boolean;
  est_relais: boolean;
  commune: string;
  distance_km: number;
  nb_annonces: number;
}
