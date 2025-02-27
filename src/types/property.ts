export type PropertyType = "vente" | "location";
export type Location = "hann-mariste" | "sacre-coeur";

export interface Photo {
  id: number;
  url: string;
}

export interface Property {
  id: number;
  reference: string;
  libelle: string;
  type_bien: "maison" | "appartement" | "terrain" | "bureau";
  surface: number;
  price: number;
  prix_journalier?: number;
  type_transaction: PropertyType;
  description: string | null;
  statut: "disponible" | "occupe" | "vendu";
  residence_id: number | null;
  etat: "propre" | "sale";
  nb_pieces: number | null;
  photo?: Photo[];
  photos?: Photo[];
  residence?: { nom: string };
  isAvailable?: boolean;
}

export interface PropertyInsert {
  libelle: string;
  type_bien: "maison" | "appartement" | "terrain" | "bureau";
  surface: number;
  price: number;
  prix_journalier?: number;
  type_transaction: PropertyType;
  description: string | null;
  residence_id: number | null;
  etat: "propre";
  statut: "disponible";
  reference: string;
  nb_pieces: number | null;
}
