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
          category: string
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
          category?: string
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
          category?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          engineer_id: string
          full_name: string
          id: string
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          email?: string
          engineer_id?: string
          full_name?: string
          id: string
          phone?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          engineer_id?: string
          full_name?: string
          id?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      recurring_reports: {
        Row: {
          active: boolean
          created_at: string
          engineer_id: string
          id: string
          next_due: string
          plant_id: string
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          engineer_id?: string
          id?: string
          next_due: string
          plant_id: string
          type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          engineer_id?: string
          id?: string
          next_due?: string
          plant_id?: string
          type?: string
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
      tasks: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string
          engineer_id: string
          id: string
          original_date: string
          status: string
          task_date: string
          title: string
        }
        Insert: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          engineer_id: string
          id?: string
          original_date?: string
          status?: string
          task_date?: string
          title: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          engineer_id?: string
          id?: string
          original_date?: string
          status?: string
          task_date?: string
          title?: string
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
      visits: {
        Row: {
          actions: Json
          completed_date: string | null
          created_at: string
          created_by: string
          custom_every: number
          custom_unit: string
          customer_attendees: Json
          discussion_points: string[]
          engineer_ids: string[]
          fm_attendees: Json
          frequency: string
          id: string
          mom_no: string
          next_visit_date: string | null
          observations: string
          planned_date: string
          plant_id: string
          purpose: string
          sign_off_required: boolean
          status: string
          visit_type: string
        }
        Insert: {
          actions?: Json
          completed_date?: string | null
          created_at?: string
          created_by?: string
          custom_every?: number
          custom_unit?: string
          customer_attendees?: Json
          discussion_points?: string[]
          engineer_ids?: string[]
          fm_attendees?: Json
          frequency?: string
          id?: string
          mom_no?: string
          next_visit_date?: string | null
          observations?: string
          planned_date: string
          plant_id: string
          purpose?: string
          sign_off_required?: boolean
          status?: string
          visit_type?: string
        }
        Update: {
          actions?: Json
          completed_date?: string | null
          created_at?: string
          created_by?: string
          custom_every?: number
          custom_unit?: string
          customer_attendees?: Json
          discussion_points?: string[]
          engineer_ids?: string[]
          fm_attendees?: Json
          frequency?: string
          id?: string
          mom_no?: string
          next_visit_date?: string | null
          observations?: string
          planned_date?: string
          plant_id?: string
          purpose?: string
          sign_off_required?: boolean
          status?: string
          visit_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      review_user: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "manager" | "engineer"
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
    Enums: {
      app_role: ["manager", "engineer"],
    },
  },
} as const
