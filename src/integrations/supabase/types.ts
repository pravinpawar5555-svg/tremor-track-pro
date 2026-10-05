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
      day_closures: {
        Row: {
          assigned: number
          carried: number
          closed_at: string
          completed: number
          engineer_id: string
          id: string
          note: string
          remaining: number
          waiting: number
          work_date: string
          work_domain: string
        }
        Insert: {
          assigned?: number
          carried?: number
          closed_at?: string
          completed?: number
          engineer_id: string
          id?: string
          note?: string
          remaining?: number
          waiting?: number
          work_date: string
          work_domain?: string
        }
        Update: {
          assigned?: number
          carried?: number
          closed_at?: string
          completed?: number
          engineer_id?: string
          id?: string
          note?: string
          remaining?: number
          waiting?: number
          work_date?: string
          work_domain?: string
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
      execution_activity: {
        Row: {
          by_user: string
          created_at: string
          id: string
          job_id: string
          kind: string
          text: string
        }
        Insert: {
          by_user?: string
          created_at?: string
          id?: string
          job_id: string
          kind?: string
          text?: string
        }
        Update: {
          by_user?: string
          created_at?: string
          id?: string
          job_id?: string
          kind?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_activity_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "execution_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_daily_updates: {
        Row: {
          attachment_link: string
          created_at: string
          created_by: string
          id: string
          job_id: string
          pending_next_action: string
          remark: string
          work_completed: string
          work_date: string
        }
        Insert: {
          attachment_link?: string
          created_at?: string
          created_by?: string
          id?: string
          job_id: string
          pending_next_action?: string
          remark?: string
          work_completed?: string
          work_date: string
        }
        Update: {
          attachment_link?: string
          created_at?: string
          created_by?: string
          id?: string
          job_id?: string
          pending_next_action?: string
          remark?: string
          work_completed?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_daily_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "execution_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_engineers: {
        Row: {
          branch: string
          created_at: string
          email: string
          employee_id: string
          id: string
          linked_user_id: string
          mobile: string
          name: string
          role: string
          status: string
        }
        Insert: {
          branch?: string
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
          linked_user_id?: string
          mobile?: string
          name: string
          role?: string
          status?: string
        }
        Update: {
          branch?: string
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
          linked_user_id?: string
          mobile?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      execution_jobs: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          aip_generated: string
          assigned_engineer_id: string
          comments: string
          completed_at: string | null
          completed_by: string
          configuration_completed: string
          contact_number: string
          contact_person: string
          created_at: string
          created_by: string
          customer_name: string
          email: string
          expected_execution_date: string | null
          id: string
          installation_type: string
          kickoff_completed: string
          links: Json
          location: string
          machines_covered: number
          next_planned_date: string | null
          notes: string
          pending_reason: string
          pending_remark: string
          planned_end_date: string | null
          planned_start_date: string | null
          plant_id: string
          plant_name: string
          priority: string
          report_link: string
          schedule_notes: string
          secondary_engineer_id: string
          sensors_installed: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          aip_generated?: string
          assigned_engineer_id?: string
          comments?: string
          completed_at?: string | null
          completed_by?: string
          configuration_completed?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          customer_name?: string
          email?: string
          expected_execution_date?: string | null
          id?: string
          installation_type?: string
          kickoff_completed?: string
          links?: Json
          location?: string
          machines_covered?: number
          next_planned_date?: string | null
          notes?: string
          pending_reason?: string
          pending_remark?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          plant_id?: string
          plant_name?: string
          priority?: string
          report_link?: string
          schedule_notes?: string
          secondary_engineer_id?: string
          sensors_installed?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          aip_generated?: string
          assigned_engineer_id?: string
          comments?: string
          completed_at?: string | null
          completed_by?: string
          configuration_completed?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          customer_name?: string
          email?: string
          expected_execution_date?: string | null
          id?: string
          installation_type?: string
          kickoff_completed?: string
          links?: Json
          location?: string
          machines_covered?: number
          next_planned_date?: string | null
          notes?: string
          pending_reason?: string
          pending_remark?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          plant_id?: string
          plant_name?: string
          priority?: string
          report_link?: string
          schedule_notes?: string
          secondary_engineer_id?: string
          sensors_installed?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          acked_by: string[]
          at: string
          author_id: string
          created_at: string
          date: string
          id: string
          read_by: string[]
          text: string
          thread: string
          work_domain: string
        }
        Insert: {
          acked_by?: string[]
          at?: string
          author_id?: string
          created_at?: string
          date: string
          id: string
          read_by?: string[]
          text?: string
          thread: string
          work_domain?: string
        }
        Update: {
          acked_by?: string[]
          at?: string
          author_id?: string
          created_at?: string
          date?: string
          id?: string
          read_by?: string[]
          text?: string
          thread?: string
          work_domain?: string
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
          vibassist: number
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
          vibassist?: number
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
          vibassist?: number
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
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          notify: string
          plant_id: string
          remind_date: string
          remind_time: string
          seen_at: string | null
          status: string
          task_id: string
          title: string
          user_id: string
          work_domain: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notify?: string
          plant_id?: string
          remind_date: string
          remind_time?: string
          seen_at?: string | null
          status?: string
          task_id?: string
          title: string
          user_id: string
          work_domain?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notify?: string
          plant_id?: string
          remind_date?: string
          remind_time?: string
          seen_at?: string | null
          status?: string
          task_id?: string
          title?: string
          user_id?: string
          work_domain?: string
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
          activity: Json
          assigned_by: string
          carry_forward_count: number
          completed_at: string | null
          completion_note: string
          created_at: string
          description: string
          due_date: string | null
          due_time: string
          engineer_id: string
          id: string
          original_date: string
          plant_id: string
          priority: string
          started_at: string | null
          status: string
          task_date: string
          task_type: string
          title: string
          updated_at: string
          waiting_reason: string
          work_domain: string
        }
        Insert: {
          activity?: Json
          assigned_by?: string
          carry_forward_count?: number
          completed_at?: string | null
          completion_note?: string
          created_at?: string
          description?: string
          due_date?: string | null
          due_time?: string
          engineer_id: string
          id?: string
          original_date?: string
          plant_id?: string
          priority?: string
          started_at?: string | null
          status?: string
          task_date?: string
          task_type?: string
          title: string
          updated_at?: string
          waiting_reason?: string
          work_domain?: string
        }
        Update: {
          activity?: Json
          assigned_by?: string
          carry_forward_count?: number
          completed_at?: string | null
          completion_note?: string
          created_at?: string
          description?: string
          due_date?: string | null
          due_time?: string
          engineer_id?: string
          id?: string
          original_date?: string
          plant_id?: string
          priority?: string
          started_at?: string | null
          status?: string
          task_date?: string
          task_type?: string
          title?: string
          updated_at?: string
          waiting_reason?: string
          work_domain?: string
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
      is_exec_engineer_id: { Args: { _id: string }; Returns: boolean }
      my_exec_ids: { Args: { _uid: string }; Returns: string[] }
      review_user: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      user_domain: { Args: { _uid: string }; Returns: string }
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
