export type UserRole = "driver" | "boss";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
        };
        Relationships: [];
      };
      daily_entries: {
        Row: {
          id: string;
          driver_id: string;
          entry_date: string;
          vehicle_registration: string;
          km_depart: number;
          km_arrivee: number;
          matin_tournee_numero: string | null;
          matin_poses_livraison: number | null;
          matin_poses_enlevement: number | null;
          matin_courses: string | null;
          apres_midi_tournee_numero: string | null;
          apres_midi_poses_livraison: number | null;
          apres_midi_poses_enlevement: number | null;
          apres_midi_courses: string | null;
          anomalie_tournee: string | null;
          anomalie_vehicule: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          entry_date: string;
          vehicle_registration: string;
          km_depart: number;
          km_arrivee: number;
          matin_tournee_numero?: string | null;
          matin_poses_livraison?: number | null;
          matin_poses_enlevement?: number | null;
          matin_courses?: string | null;
          apres_midi_tournee_numero?: string | null;
          apres_midi_poses_livraison?: number | null;
          apres_midi_poses_enlevement?: number | null;
          apres_midi_courses?: string | null;
          anomalie_tournee?: string | null;
          anomalie_vehicule?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          entry_date?: string;
          vehicle_registration?: string;
          km_depart?: number;
          km_arrivee?: number;
          matin_tournee_numero?: string | null;
          matin_poses_livraison?: number | null;
          matin_poses_enlevement?: number | null;
          matin_courses?: string | null;
          apres_midi_tournee_numero?: string | null;
          apres_midi_poses_livraison?: number | null;
          apres_midi_poses_enlevement?: number | null;
          apres_midi_courses?: string | null;
          anomalie_tournee?: string | null;
          anomalie_vehicule?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_entries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
