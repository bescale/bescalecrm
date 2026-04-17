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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          price: number
          price_label: string
          max_whatsapp_sessions: number
          max_users: number
          max_agents: number
          max_contacts: number
          ai_enabled: boolean
          priority_support: boolean
          custom_branding: boolean
          api_access: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          price?: number
          price_label?: string
          max_whatsapp_sessions?: number
          max_users?: number
          max_agents?: number
          max_contacts?: number
          ai_enabled?: boolean
          priority_support?: boolean
          custom_branding?: boolean
          api_access?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          price?: number
          price_label?: string
          max_whatsapp_sessions?: number
          max_users?: number
          max_agents?: number
          max_contacts?: number
          ai_enabled?: boolean
          priority_support?: boolean
          custom_branding?: boolean
          api_access?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          avg_response_time: number | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          model: string | null
          name: string
          schedule: Json | null
          session_id: string | null
          settings: Json | null
          status: string
          system_prompt: string | null
          total_conversations: number
          total_qualified: number
          updated_at: string
        }
        Insert: {
          avg_response_time?: number | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name: string
          schedule?: Json | null
          session_id?: string | null
          settings?: Json | null
          status?: string
          system_prompt?: string | null
          total_conversations?: number
          total_qualified?: number
          updated_at?: string
        }
        Update: {
          avg_response_time?: number | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name?: string
          schedule?: Json | null
          session_id?: string | null
          settings?: Json | null
          status?: string
          system_prompt?: string | null
          total_conversations?: number
          total_qualified?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_area: string | null
          cnpj: string | null
          created_at: string
          description: string | null
          id: string
          invite_code: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          plan: string
          plan_id: string
          products_services: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_area?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan?: string
          plan_id?: string
          products_services?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_area?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan?: string
          plan_id?: string
          products_services?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          id: string
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          responsible_id: string | null
          score: number
          score_override: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          responsible_id?: string | null
          score?: number
          score_override?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          responsible_id?: string | null
          score?: number
          score_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          closed_at: string | null
          company_id: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          session_id: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          closed_at?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          session_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          closed_at?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          session_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          notes: string | null
          position: number
          probability: number
          responsible_id: string | null
          stage_id: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          probability?: number
          responsible_id?: string | null
          stage_id: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          probability?: number
          responsible_id?: string | null
          stage_id?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_tags: {
        Row: {
          opportunity_id: string
          tag_id: string
        }
        Insert: {
          opportunity_id: string
          tag_id: string
        }
        Update: {
          opportunity_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tags_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          id: string
          company_id: string
          day_of_week: number
          is_open: boolean
          open_time: string
          close_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          day_of_week: number
          is_open?: boolean
          open_time?: string
          close_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          day_of_week?: number
          is_open?: boolean
          open_time?: string
          close_time?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          shortcut: string | null
          title: string
          media_url: string | null
          media_type: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title: string
          media_url?: string | null
          media_type?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title?: string
          media_url?: string | null
          media_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_links: {
        Row: {
          id: string
          company_id: string
          plan: string
          plan_name: string
          plan_price: string
          token: string
          status: string
          created_by: string | null
          signed_at: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          company_id: string
          plan: string
          plan_name: string
          plan_price: string
          token?: string
          status?: string
          created_by?: string | null
          signed_at?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          plan?: string
          plan_name?: string
          plan_price?: string
          token?: string
          status?: string
          created_by?: string | null
          signed_at?: string | null
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          phone_number: string | null
          settings: Json | null
          status: string
          updated_at: string
          waha_instance_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone_number?: string | null
          settings?: Json | null
          status?: string
          updated_at?: string
          waha_instance_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone_number?: string | null
          settings?: Json | null
          status?: string
          updated_at?: string
          waha_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_and_assign: {
        Args: { _cnpj?: string; _name: string }
        Returns: string
      }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_company_by_invite_code: {
        Args: { _invite_code: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "agent" | "viewer"
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
      app_role: ["super_admin", "admin", "agent", "viewer"],
    },
  },
} as const
