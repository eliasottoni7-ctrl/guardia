export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_trips: {
        Row: {
          created_at: string | null
          destination_lat: number | null
          destination_lng: number | null
          expires_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          expires_at: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          expires_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_recipients: {
        Row: {
          alert_id: string
          contact_id: string | null
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          alert_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          alert_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_recipients_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "trusted_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          channel: string
          created_at: string
          id: string
          lat: number
          lng: number
          message_body: string
          recipients_count: number
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          message_body: string
          recipients_count?: number
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          message_body?: string
          recipients_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      guardians_circle: {
        Row: {
          created_at: string | null
          guardian_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          guardian_id: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          guardian_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      map_risk_confirmations: {
        Row: {
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_risk_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "map_risk_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      map_risk_reports: {
        Row: {
          category_code: string
          confirmation_count: number | null
          created_at: string
          id: string
          last_confirmed_at: string | null
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          category_code: string
          confirmation_count?: number | null
          created_at?: string
          id?: string
          last_confirmed_at?: string | null
          lat: number
          lng: number
          user_id: string
        }
        Update: {
          category_code?: string
          confirmation_count?: number | null
          created_at?: string
          id?: string
          last_confirmed_at?: string | null
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_risk_reports_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "risk_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          full_name: string | null
          id: string
          kyc_verified: boolean | null
          medals: string[] | null
          reputation_score: number | null
          share_code: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          cpf?: string | null
          full_name?: string | null
          id: string
          kyc_verified?: boolean | null
          medals?: string[] | null
          reputation_score?: number | null
          share_code?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          cpf?: string | null
          full_name?: string | null
          id?: string
          kyc_verified?: boolean | null
          medals?: string[] | null
          reputation_score?: number | null
          share_code?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      risk_categories: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      trusted_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          phone_normalized: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          phone_normalized: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          phone_normalized?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_risk_report: { Args: { p_report_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
