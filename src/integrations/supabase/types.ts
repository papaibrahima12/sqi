export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin: {
        Row: {
          created_at: string | null
          email: string
          id: number
          nom: string
          password: string
          prenom: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          nom: string
          password: string
          prenom: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          nom?: string
          password?: string
          prenom?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client: {
        Row: {
          id: number
          prenom: string
          nom: string
          email: string
          adresse: string
          telephone:string;
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          prenom: string
          nom: string
          email: string
          adresse: string
          telephone:string;
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          prenom?: string
          nom?: string
          email?: string
          adresse?: string
          telephone:string;
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bien: {
        Row: {
          created_at: string | null
          description: string | null
          etat: Database["public"]["Enums"]["etat_bien"]
          id: number
          libelle: string
          nb_pieces: number | null
          price: number
          prix_journalier: number | null
          reference: string
          residence_id: number | null
          statut: Database["public"]["Enums"]["statut_bien"]
          surface: number
          type_bien: Database["public"]["Enums"]["type_bien"]
          type_transaction: Database["public"]["Enums"]["price_info_type"]
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          etat?: Database["public"]["Enums"]["etat_bien"]
          id?: number
          libelle: string
          nb_pieces?: number | null
          price?: number
          prix_journalier?: number | null
          reference: string
          residence_id?: number | null
          statut?: Database["public"]["Enums"]["statut_bien"]
          surface: number
          type_bien: Database["public"]["Enums"]["type_bien"]
          type_transaction?: Database["public"]["Enums"]["price_info_type"]
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          etat?: Database["public"]["Enums"]["etat_bien"]
          id?: number
          libelle?: string
          nb_pieces?: number | null
          price?: number
          prix_journalier?: number | null
          reference?: string
          residence_id?: number | null
          statut?: Database["public"]["Enums"]["statut_bien"]
          surface?: number
          type_bien?: Database["public"]["Enums"]["type_bien"]
          type_transaction?: Database["public"]["Enums"]["price_info_type"]
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bien_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "residence"
            referencedColumns: ["id"]
          },
        ]
      }
      demande: {
        Row: {
          bien_id: number | null
          commentaire: string | null
          created_at: string | null
          date_debut_location: string | null
          date_fin_location: string | null
          email: string
          forfait: string | null
          id: number
          motif_perte: string | null
          piece: string | null
          nom: string
          prenom: string
          statut: Database["public"]["Enums"]["statut_demande"]
          statut_vente:
            | Database["public"]["Enums"]["statut_demande_vente"]
            | null
          telephone: string
          type_demande: Database["public"]["Enums"]["type_demande"]
          updated_at: string | null
        }
        Insert: {
          bien_id?: number | null
          commentaire?: string | null
          created_at?: string | null
          date_debut_location?: string | null
          date_fin_location?: string | null
          email: string
          forfait?: string | null
          id?: number
          motif_perte?: string | null
          piece?: string | null
          nom: string
          prenom: string
          statut?: Database["public"]["Enums"]["statut_demande"]
          statut_vente?:
            | Database["public"]["Enums"]["statut_demande_vente"]
            | null
          telephone: string
          type_demande: Database["public"]["Enums"]["type_demande"]
          updated_at?: string | null
        }
        Update: {
          bien_id?: number | null
          commentaire?: string | null
          created_at?: string | null
          date_debut_location?: string | null
          date_fin_location?: string | null
          email?: string
          forfait?: string | null
          id?: number
          motif_perte?: string | null
          piece?: string | null
          nom?: string
          prenom?: string
          statut?: Database["public"]["Enums"]["statut_demande"]
          statut_vente?:
            | Database["public"]["Enums"]["statut_demande_vente"]
            | null
          telephone?: string
          type_demande?: Database["public"]["Enums"]["type_demande"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demande_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation: {
        Row: {
          bien_id: number | null
          commentaire: string | null
          created_at: string | null
          date_evaluation: string | null
          id: number
          note: number
          updated_at: string | null
        }
        Insert: {
          bien_id?: number | null
          commentaire?: string | null
          created_at?: string | null
          date_evaluation?: string | null
          id?: number
          note: number
          updated_at?: string | null
        }
        Update: {
          bien_id?: number | null
          commentaire?: string | null
          created_at?: string | null
          date_evaluation?: string | null
          id?: number
          note?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
        ]
      }
      location: {
        Row: {
          bien_id: number | null
          client_id: number | null
          cni_url: string | null
          commentaire: string | null
          contrat_signe: boolean | null
          created_at: string | null
          date_debut: string
          date_fin: string
          forfait: string
          date_signature: string | null
          demande_id: number | null
          id: number
          prix_journalier: number | null
          statut: Database["public"]["Enums"]["statut_transaction"]
          updated_at: string | null
        }
        Insert: {
          bien_id?: number | null
          client_id?: number | null
          cni_url?: string | null
          commentaire?: string | null
          contrat_signe?: boolean | null
          created_at?: string | null
          date_debut: string
          date_fin: string
          forfait: string
          date_signature?: string | null
          demande_id?: number | null
          id?: number
          prix_journalier?: number | null
          statut?: Database["public"]["Enums"]["statut_transaction"]
          updated_at?: string | null
        }
        Update: {
          bien_id?: number | null
          client_id?: number | null
          cni_url?: string | null
          commentaire?: string | null
          contrat_signe?: boolean | null
          created_at?: string | null
          date_debut?: string
          date_fin?: string
          forfait: string
          date_signature?: string | null
          demande_id?: number | null
          id?: number
          prix_journalier?: number | null
          statut?: Database["public"]["Enums"]["statut_transaction"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      photo: {
        Row: {
          bien_id: number | null
          created_at: string | null
          display_order: number | null
          id: number
          url: string
        }
        Insert: {
          bien_id?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          url: string
        }
        Update: {
          bien_id?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamation: {
        Row: {
          bien_id: number | null
          created_at: string | null
          date_reclamation: string | null
          description: string
          id: number
          statut: string
          updated_at: string | null
        }
        Insert: {
          bien_id?: number | null
          created_at?: string | null
          date_reclamation?: string | null
          description: string
          id?: number
          statut?: string
          updated_at?: string | null
        }
        Update: {
          bien_id?: number | null
          created_at?: string | null
          date_reclamation?: string | null
          description?: string
          id?: number
          statut?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reclamation_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
        ]
      }
      residence: {
        Row: {
          adresse: string
          created_at: string | null
          id: number
          latitude: number
          longitude: number
          nom: string
          updated_at: string | null
        }
        Insert: {
          adresse: string
          created_at?: string | null
          id?: number
          latitude: number
          longitude: number
          nom: string
          updated_at?: string | null
        }
        Update: {
          adresse?: string
          created_at?: string | null
          id?: number
          latitude?: number
          longitude?: number
          nom?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vente: {
        Row: {
          acte_signe: boolean | null
          bien_id: number | null
          commentaire: string | null
          compromis_signe: boolean | null
          created_at: string | null
          date_compromis: string | null
          date_signature: string | null
          demande_id: number | null
          id: number
          prix_vente: number
          statut: Database["public"]["Enums"]["statut_transaction"]
          updated_at: string | null
        }
        Insert: {
          acte_signe?: boolean | null
          bien_id?: number | null
          commentaire?: string | null
          compromis_signe?: boolean | null
          created_at?: string | null
          date_compromis?: string | null
          date_signature?: string | null
          demande_id?: number | null
          id?: number
          prix_vente: number
          statut?: Database["public"]["Enums"]["statut_transaction"]
          updated_at?: string | null
        }
        Update: {
          acte_signe?: boolean | null
          bien_id?: number | null
          commentaire?: string | null
          compromis_signe?: boolean | null
          created_at?: string | null
          date_compromis?: string | null
          date_signature?: string | null
          demande_id?: number | null
          id?: number
          prix_vente?: number
          statut?: Database["public"]["Enums"]["statut_transaction"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vente_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "bien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vente_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demande"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_location: {
        Args: {
          location_id: number
        }
        Returns: undefined
      }
      create_location_by_calendar: {
        Args: {
          p_bien_id: number
          p_date_debut: string
          p_date_fin: string
          p_nom: string
          p_prenom: string
          p_telephone: string
          p_email: string
          p_adresse: string
          p_cni: string
        }
        Returns: number
      }
    }
    Enums: {
      etat_bien: "propre" | "sale"
      price_info_type: "location" | "vente"
      statut_bien: "disponible" | "occupe" | "vendu"
      statut_demande: "en_attente" | "approuve" | "refuse"
      statut_demande_vente:
        | "nouveau"
        | "qualification"
        | "offre"
        | "negociation"
        | "gagnee"
        | "perdue"
      statut_transaction: "en_cours" | "finalise" | "annule"
      type_bien: "maison" | "appartement" | "terrain" | "bureau"
      type_demande: "location" | "vente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
