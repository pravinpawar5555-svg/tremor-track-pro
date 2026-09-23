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
      daily_updates: {
        Row: {
          abnormal: number
          created_at: string
          date: string
          engineer_id: string
          id: string
          machines_checked: number
          new_high_risk: number
          plant_id: string
          remark: string
          repeat_high_risk: number
          submitted_at: string
        }
        Insert: {
          abnormal?: number
          created_at?: string
          date: string
          engineer_id?: string
          id: string
          machines_checked?: number
          new_high_risk?: number
          plant_id?: string
          remark?: string
          repeat_high_risk?: number
          submitted_at?: string
        }
        Update: {
          abnormal?: number
          created_at?: string
          date?: string
          engineer_id?: string
          id?: string
          machines_checked?: number
          new_high_risk?: number
          plant_id?: string
          remark?: string
          repeat_high_risk?: number
          submitted_at?: string
        }
        Relationships: []
      }
      engineers: {
        Row: {
          created_at: string
          id: string
          initials: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          initials?: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          initials?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          at: string
          author_id: string
          created_at: string
          date: string
          id: string
          read_by: string[]
          text: string
          thread: string
        }
        Insert: {
          at?: string
          author_id?: string
          created_at?: string
          date: string
          id: string
          read_by?: string[]
          text?: string
          thread: string
        }
        Update: {
          at?: string
          author_id?: string
          created_at?: string
          date?: string
          id?: string
          read_by?: string[]
          text?: string
          thread?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          assets: number
          contact: string
          contact_phone: string
          created_at: string
          customer: string
          engineer_id: string
          frequencies: string[]
          id: string
          location: string
          machines: number
          name: string
          node_x: number
          node6: number
        }
        Insert: {
          assets?: number
          contact?: string
          contact_phone?: string
          created_at?: string
          customer?: string
          engineer_id?: string
          frequencies?: string[]
          id: string
          location?: string
          machines?: number
          name: string
          node_x?: number
          node6?: number
        }
        Update: {
          assets?: number
          contact?: string
          contact_phone?: string
          created_at?: string
          customer?: string
          engineer_id?: string
          frequencies?: string[]
          id?: string
          location?: string
          machines?: number
          name?: string
          node_x?: number
          node6?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          by_engineer_id: string
          created_at: string
          doc_no: string
          due_date: string
          id: string
          period: string
          plant_id: string
          sent_date: string | null
          status: string
          type: string
        }
        Insert: {
          by_engineer_id?: string
          created_at?: string
          doc_no?: string
          due_date: string
          id: string
          period?: string
          plant_id?: string
          sent_date?: string | null
          status?: string
          type?: string
        }
        Update: {
          by_engineer_id?: string
          created_at?: string
          doc_no?: string
          due_date?: string
          id?: string
          period?: string
          plant_id?: string
          sent_date?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          area: string
          ask_for: string
          assigned_to: string
          closed_on: string | null
          created_at: string
          id: string
          machine: string
          observation: string
          plant_id: string
          priority: string
          raised_at: string
          raised_by: string
          raised_on: string
          responded_on: string | null
          response: string | null
          status: string
          subject: string
          ticket_no: string
        }
        Insert: {
          area?: string
          ask_for?: string
          assigned_to?: string
          closed_on?: string | null
          created_at?: string
          id: string
          machine?: string
          observation?: string
          plant_id?: string
          priority?: string
          raised_at?: string
          raised_by?: string
          raised_on: string
          responded_on?: string | null
          response?: string | null
          status?: string
          subject?: string
          ticket_no?: string
        }
        Update: {
          area?: string
          ask_for?: string
          assigned_to?: string
          closed_on?: string | null
          created_at?: string
          id?: string
          machine?: string
          observation?: string
          plant_id?: string
          priority?: string
          raised_at?: string
          raised_by?: string
          raised_on?: string
          responded_on?: string | null
          response?: string | null
          status?: string
          subject?: string
          ticket_no?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
