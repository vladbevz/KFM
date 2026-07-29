export type UserRole = "driver" | "boss";
export type PaymentModel =
  | "qty_am_qty_pm"
  | "qty_am_forfait_pm"
  | "forfait_day"
  | "qty_day";
export type VehicleStatus =
  | "operational"
  | "issue_running"
  | "unavailable"
  | "in_repair";
export type AssignmentType = "tournee" | "conge" | "absence";
export type EntryStatus = "in_progress" | "completed";
export type TourneeType = "journee" | "matin" | "apres_midi";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          default_sector_id: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          default_sector_id?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          default_sector_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_sector_id_fkey";
            columns: ["default_sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      sectors: {
        Row: {
          id: string;
          code: string;
          payment_type: PaymentModel;
          morning_threshold: number | null;
          afternoon_threshold: number | null;
          day_threshold: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          payment_type: PaymentModel;
          morning_threshold?: number | null;
          afternoon_threshold?: number | null;
          day_threshold?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          payment_type?: PaymentModel;
          morning_threshold?: number | null;
          afternoon_threshold?: number | null;
          day_threshold?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_entries: {
        Row: {
          id: string;
          driver_id: string;
          entry_date: string;
          status: EntryStatus;
          started_at: string | null;
          ended_at: string | null;
          tournee_type: TourneeType | null;
          sector_id: string | null;
          vehicle_registration: string | null;
          km_depart: number | null;
          km_arrivee: number | null;
          poses_delivered: number | null;
          poses_damaged: number | null;
          poses_not_delivered: number | null;
          poses_enlevement: number | null;
          courses: string | null;
          matin_tournee_numero: string | null;
          matin_poses_livraison: number | null;
          matin_poses_enlevement: number | null;
          matin_courses: string | null;
          matin_sector_id: string | null;
          apres_midi_tournee_numero: string | null;
          apres_midi_poses_livraison: number | null;
          apres_midi_poses_enlevement: number | null;
          apres_midi_courses: string | null;
          apres_midi_sector_id: string | null;
          anomalie_tournee: string | null;
          anomalie_vehicule: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          entry_date: string;
          status?: EntryStatus;
          started_at?: string | null;
          ended_at?: string | null;
          tournee_type?: TourneeType | null;
          sector_id?: string | null;
          vehicle_registration?: string | null;
          km_depart?: number | null;
          km_arrivee?: number | null;
          poses_delivered?: number | null;
          poses_damaged?: number | null;
          poses_not_delivered?: number | null;
          poses_enlevement?: number | null;
          courses?: string | null;
          matin_tournee_numero?: string | null;
          matin_poses_livraison?: number | null;
          matin_poses_enlevement?: number | null;
          matin_courses?: string | null;
          matin_sector_id?: string | null;
          apres_midi_tournee_numero?: string | null;
          apres_midi_poses_livraison?: number | null;
          apres_midi_poses_enlevement?: number | null;
          apres_midi_courses?: string | null;
          apres_midi_sector_id?: string | null;
          anomalie_tournee?: string | null;
          anomalie_vehicule?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          entry_date?: string;
          status?: EntryStatus;
          started_at?: string | null;
          ended_at?: string | null;
          tournee_type?: TourneeType | null;
          sector_id?: string | null;
          vehicle_registration?: string | null;
          km_depart?: number | null;
          km_arrivee?: number | null;
          poses_delivered?: number | null;
          poses_damaged?: number | null;
          poses_not_delivered?: number | null;
          poses_enlevement?: number | null;
          courses?: string | null;
          matin_tournee_numero?: string | null;
          matin_poses_livraison?: number | null;
          matin_poses_enlevement?: number | null;
          matin_courses?: string | null;
          matin_sector_id?: string | null;
          apres_midi_tournee_numero?: string | null;
          apres_midi_poses_livraison?: number | null;
          apres_midi_poses_enlevement?: number | null;
          apres_midi_courses?: string | null;
          apres_midi_sector_id?: string | null;
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
          {
            foreignKeyName: "daily_entries_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_entries_matin_sector_id_fkey";
            columns: ["matin_sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_entries_apres_midi_sector_id_fkey";
            columns: ["apres_midi_sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          plate: string;
          label: string | null;
          status: VehicleStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          plate: string;
          label?: string | null;
          status?: VehicleStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          plate?: string;
          label?: string | null;
          status?: VehicleStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicle_issues: {
        Row: {
          id: string;
          vehicle_id: string;
          reported_by: string | null;
          description: string | null;
          photo_url: string | null;
          status: "open" | "resolved";
          reported_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          reported_by?: string | null;
          description?: string | null;
          photo_url?: string | null;
          status?: "open" | "resolved";
          reported_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          reported_by?: string | null;
          description?: string | null;
          photo_url?: string | null;
          status?: "open" | "resolved";
          reported_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_issues_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_issues_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule: {
        Row: {
          id: string;
          driver_id: string;
          date: string;
          type: AssignmentType;
          sector_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          date: string;
          type: AssignmentType;
          sector_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          date?: string;
          type?: AssignmentType;
          sector_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      fuel_logs: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string;
          liters: number;
          odometer: number;
          filled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id: string;
          liters: number;
          odometer: number;
          filled_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string;
          liters?: number;
          odometer?: number;
          filled_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fuel_logs_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_documents: {
        Row: {
          id: string;
          vehicle_id: string;
          doc_name: string;
          file_url: string;
          expiry_date: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          doc_name: string;
          file_url: string;
          expiry_date?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          doc_name?: string;
          file_url?: string;
          expiry_date?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_documents: {
        Row: {
          id: string;
          driver_id: string;
          doc_name: string;
          file_url: string | null;
          expiry_date: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          doc_name: string;
          file_url?: string | null;
          expiry_date?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          doc_name?: string;
          file_url?: string | null;
          expiry_date?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      report_vehicle_issue: {
        Args: {
          p_vehicle_id: string;
          p_new_status: VehicleStatus;
          p_description: string | null;
          p_photo_url?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
