export type UserRole = "driver" | "boss";
export type PaymentType = "a_la_pose" | "forfait";
export type VehicleStatus =
  | "operational"
  | "issue_running"
  | "unavailable"
  | "in_repair";
export type AssignmentType = "tournee" | "conge" | "absence";
export type ScheduleSource = "prevu" | "reel";
export type EntryStatus = "in_progress" | "completed";
export type TourneeType = "journee" | "demi_journee";
export type CongeRequestStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          default_sector_id: string | null;
          default_vehicle_id: string | null;
          active: boolean;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          default_sector_id?: string | null;
          default_vehicle_id?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          default_sector_id?: string | null;
          default_vehicle_id?: string | null;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_sector_id_fkey";
            columns: ["default_sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_default_vehicle_id_fkey";
            columns: ["default_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      sectors: {
        Row: {
          id: string;
          code: string;
          payment_type: PaymentType;
          rentability_target: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          payment_type?: PaymentType;
          rentability_target?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          payment_type?: PaymentType;
          rentability_target?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sector_prices: {
        Row: {
          sector_id: string;
          price_per_pose: number | null;
          updated_at: string;
        };
        Insert: {
          sector_id: string;
          price_per_pose?: number | null;
          updated_at?: string;
        };
        Update: {
          sector_id?: string;
          price_per_pose?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sector_prices_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: true;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      sector_forfait_amounts: {
        Row: {
          sector_id: string;
          forfait_amount: number | null;
          updated_at: string;
        };
        Insert: {
          sector_id: string;
          forfait_amount?: number | null;
          updated_at?: string;
        };
        Update: {
          sector_id?: string;
          forfait_amount?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sector_forfait_amounts_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: true;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_entry_price_snapshots: {
        Row: {
          entry_id: string;
          price_per_pose: number | null;
          forfait_amount: number | null;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          price_per_pose?: number | null;
          forfait_amount?: number | null;
          created_at?: string;
        };
        Update: {
          entry_id?: string;
          price_per_pose?: number | null;
          forfait_amount?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_entry_price_snapshots_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: true;
            referencedRelation: "daily_entries";
            referencedColumns: ["id"];
          },
        ];
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
          dispatch_declared_total: number | null;
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
          dispatch_declared_total?: number | null;
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
          dispatch_declared_total?: number | null;
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
          retired: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          plate: string;
          label?: string | null;
          status?: VehicleStatus;
          retired?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          plate?: string;
          label?: string | null;
          status?: VehicleStatus;
          retired?: boolean;
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
          voice_url: string | null;
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
          voice_url?: string | null;
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
          voice_url?: string | null;
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
          source: ScheduleSource;
          planned_sector_id: string | null;
        };
        Insert: {
          id?: string;
          driver_id: string;
          date: string;
          type: AssignmentType;
          sector_id?: string | null;
          note?: string | null;
          created_at?: string;
          source?: ScheduleSource;
          planned_sector_id?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string;
          date?: string;
          type?: AssignmentType;
          sector_id?: string | null;
          note?: string | null;
          created_at?: string;
          source?: ScheduleSource;
          planned_sector_id?: string | null;
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
          {
            foreignKeyName: "schedule_planned_sector_id_fkey";
            columns: ["planned_sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      conge_requests: {
        Row: {
          id: string;
          driver_id: string;
          start_date: string;
          end_date: string;
          status: CongeRequestStatus;
          note: string | null;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          driver_id: string;
          start_date: string;
          end_date: string;
          status?: CongeRequestStatus;
          note?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string;
          start_date?: string;
          end_date?: string;
          status?: CongeRequestStatus;
          note?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conge_requests_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conge_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      vehicle_repairs: {
        Row: {
          id: string;
          vehicle_id: string;
          vehicle_issue_id: string | null;
          description: string;
          cost: number;
          repaired_at: string;
          invoice_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          vehicle_issue_id?: string | null;
          description: string;
          cost: number;
          repaired_at?: string;
          invoice_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          vehicle_issue_id?: string | null;
          description?: string;
          cost?: number;
          repaired_at?: string;
          invoice_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_repairs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_repairs_vehicle_issue_id_fkey";
            columns: ["vehicle_issue_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_issues";
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
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          panne_signalee: boolean;
          echeance_proche: boolean;
          echeance_depassee: boolean;
          demande_conge: boolean;
        };
        Insert: {
          user_id: string;
          panne_signalee?: boolean;
          echeance_proche?: boolean;
          echeance_depassee?: boolean;
          demande_conge?: boolean;
        };
        Update: {
          user_id?: string;
          panne_signalee?: boolean;
          echeance_proche?: boolean;
          echeance_depassee?: boolean;
          demande_conge?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
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
          p_voice_url?: string | null;
        };
        Returns: undefined;
      };
      conge_dates_other_drivers: {
        Args: {
          from_date: string;
          to_date: string;
        };
        Returns: { conge_date: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
