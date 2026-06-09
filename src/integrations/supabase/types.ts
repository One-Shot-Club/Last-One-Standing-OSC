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
      admin_actions: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          id: string
          payload: Json
          target_id: string | null
          target_type: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          diff: Json
          id: string
          op: string
          row_id: string | null
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          diff?: Json
          id?: string
          op: string
          row_id?: string | null
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          diff?: Json
          id?: string
          op?: string
          row_id?: string | null
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_entries: {
        Row: {
          alive: boolean
          competition_id: string
          created_at: string
          entrant_id: string
          id: string
          magic_token: string
          paid: boolean
          player_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alive?: boolean
          competition_id: string
          created_at?: string
          entrant_id: string
          id?: string
          magic_token?: string
          paid?: boolean
          player_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alive?: boolean
          competition_id?: string
          created_at?: string
          entrant_id?: string
          id?: string
          magic_token?: string
          paid?: boolean
          player_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_entrant_id_fkey"
            columns: ["entrant_id"]
            isOneToOne: false
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          club_logo_url: string | null
          club_name: string | null
          created_at: string
          current_week: number
          entry_fee: number
          id: string
          name: string
          payment_link: string | null
          prize_pool: number
          revolut_link: string | null
          stripe_link: string | null
          tenant_id: string
          whatsapp_link: string | null
        }
        Insert: {
          club_logo_url?: string | null
          club_name?: string | null
          created_at?: string
          current_week?: number
          entry_fee?: number
          id?: string
          name: string
          payment_link?: string | null
          prize_pool?: number
          revolut_link?: string | null
          stripe_link?: string | null
          tenant_id: string
          whatsapp_link?: string | null
        }
        Update: {
          club_logo_url?: string | null
          club_name?: string | null
          created_at?: string
          current_week?: number
          entry_fee?: number
          id?: string
          name?: string
          payment_link?: string | null
          prize_pool?: number
          revolut_link?: string | null
          stripe_link?: string | null
          tenant_id?: string
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entrants: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          source: Database["public"]["Enums"]["entrant_source"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["entrant_source"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["entrant_source"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gameweeks: {
        Row: {
          competition_id: string
          created_at: string
          deadline_at: string
          first_kickoff_at: string
          id: string
          last_match_ends_at: string
          processed_at: string | null
          results_locked: boolean
          tenant_id: string
          updated_at: string
          week_label: string
          week_number: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          deadline_at: string
          first_kickoff_at: string
          id?: string
          last_match_ends_at: string
          processed_at?: string | null
          results_locked?: boolean
          tenant_id: string
          updated_at?: string
          week_label: string
          week_number: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          deadline_at?: string
          first_kickoff_at?: string
          id?: string
          last_match_ends_at?: string
          processed_at?: string | null
          results_locked?: boolean
          tenant_id?: string
          updated_at?: string
          week_label?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gameweeks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audience: string
          body: string | null
          competition_id: string | null
          id: string
          recipient_count: number | null
          sent_at: string
          sent_by: string | null
          subject: string | null
          template: string
          tenant_id: string
        }
        Insert: {
          audience: string
          body?: string | null
          competition_id?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          template: string
          tenant_id: string
        }
        Update: {
          audience?: string
          body?: string | null
          competition_id?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          template?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          competition_id: string
          created_at: string
          currency: string
          entry_id: string
          external_ref: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          recorded_by: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          competition_id: string
          created_at?: string
          currency?: string
          entry_id: string
          external_ref?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          recorded_by?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          competition_id?: string
          created_at?: string
          currency?: string
          entry_id?: string
          external_ref?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          recorded_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          player_id: string
          result: string | null
          team: string
          tenant_id: string
          week: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          player_id: string
          result?: string | null
          team: string
          tenant_id: string
          week: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          player_id?: string
          result?: string | null
          team?: string
          tenant_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "picks_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          alive: boolean
          competition_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          magic_token: string
          paid: boolean
          phone: string | null
          tenant_id: string
        }
        Insert: {
          alive?: boolean
          competition_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          magic_token?: string
          paid?: boolean
          phone?: string | null
          tenant_id: string
        }
        Update: {
          alive?: boolean
          competition_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          magic_token?: string
          paid?: boolean
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders_sent: {
        Row: {
          gameweek_id: string | null
          id: string
          kind: string
          player_id: string
          sent_at: string
          tenant_id: string
        }
        Insert: {
          gameweek_id?: string | null
          id?: string
          kind: string
          player_id: string
          sent_at?: string
          tenant_id: string
        }
        Update: {
          gameweek_id?: string | null
          id?: string
          kind?: string
          player_id?: string
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_sent_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          away_score: number | null
          away_team: string
          created_at: string
          gameweek_id: string
          home_score: number | null
          home_team: string
          id: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          created_at?: string
          gameweek_id: string
          home_score?: number | null
          home_team: string
          id?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          created_at?: string
          gameweek_id?: string
          home_score?: number | null
          home_team?: string
          id?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          badge_url: string | null
          competition_id: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          badge_url?: string | null
          competition_id: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          badge_url?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          accent_color: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          intro_copy: string | null
          logo_url: string | null
          primary_color: string | null
          reminder_offsets: Json
          sponsor_assets: Json
          tenant_id: string
          updated_at: string
          whatsapp_link: string | null
        }
        Insert: {
          accent_color?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          intro_copy?: string | null
          logo_url?: string | null
          primary_color?: string | null
          reminder_offsets?: Json
          sponsor_assets?: Json
          tenant_id: string
          updated_at?: string
          whatsapp_link?: string | null
        }
        Update: {
          accent_color?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          intro_copy?: string | null
          logo_url?: string | null
          primary_color?: string | null
          reminder_offsets?: Json
          sponsor_assets?: Json
          tenant_id?: string
          updated_at?: string
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_tenant_access: {
        Args: {
          _min_role: Database["public"]["Enums"]["tenant_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      tenant_role_for: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
    }
    Enums: {
      entrant_source: "online" | "offline" | "import"
      payment_method:
        | "online_stripe"
        | "online_revolut"
        | "online_other"
        | "cash"
        | "bank_transfer"
        | "manual_other"
      tenant_role:
        | "platform_super_admin"
        | "tenant_owner"
        | "tenant_admin"
        | "tenant_operator"
        | "tenant_viewer"
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
    Enums: {
      entrant_source: ["online", "offline", "import"],
      payment_method: [
        "online_stripe",
        "online_revolut",
        "online_other",
        "cash",
        "bank_transfer",
        "manual_other",
      ],
      tenant_role: [
        "platform_super_admin",
        "tenant_owner",
        "tenant_admin",
        "tenant_operator",
        "tenant_viewer",
      ],
    },
  },
} as const
