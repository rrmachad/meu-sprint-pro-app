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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cycle_blocks: {
        Row: {
          block_number: number
          cycle_id: string
          discipline_id: string
          duration_minutes: number
          id: string
        }
        Insert: {
          block_number?: number
          cycle_id: string
          discipline_id: string
          duration_minutes?: number
          id?: string
        }
        Update: {
          block_number?: number
          cycle_id?: string
          discipline_id?: string
          duration_minutes?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_blocks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_blocks_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_disciplines: {
        Row: {
          cycle_id: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          discipline_id: string
          id: string
          importance: Database["public"]["Enums"]["importance_level"]
          situation: Database["public"]["Enums"]["user_situation"]
        }
        Insert: {
          cycle_id: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          discipline_id: string
          id?: string
          importance?: Database["public"]["Enums"]["importance_level"]
          situation?: Database["public"]["Enums"]["user_situation"]
        }
        Update: {
          cycle_id?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          discipline_id?: string
          id?: string
          importance?: Database["public"]["Enums"]["importance_level"]
          situation?: Database["public"]["Enums"]["user_situation"]
        }
        Relationships: [
          {
            foreignKeyName: "cycle_disciplines_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          content: string | null
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disciplines: {
        Row: {
          cannot_zero: boolean
          category: Database["public"]["Enums"]["discipline_category"]
          created_at: string
          default_questions: number
          id: string
          name: string
          prova: string
          sort_order: number
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          cannot_zero?: boolean
          category?: Database["public"]["Enums"]["discipline_category"]
          created_at?: string
          default_questions?: number
          id?: string
          name: string
          prova?: string
          sort_order?: number
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          cannot_zero?: boolean
          category?: Database["public"]["Enums"]["discipline_category"]
          created_at?: string
          default_questions?: number
          id?: string
          name?: string
          prova?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      revisions: {
        Row: {
          completed: boolean
          created_at: string
          discipline_id: string
          due_date: string
          id: string
          mark: Database["public"]["Enums"]["revision_mark"]
          study_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          discipline_id: string
          due_date: string
          id?: string
          mark: Database["public"]["Enums"]["revision_mark"]
          study_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          discipline_id?: string
          due_date?: string
          id?: string
          mark?: Database["public"]["Enums"]["revision_mark"]
          study_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          cycle_block_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Insert: {
          cycle_block_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          user_id: string
        }
        Update: {
          cycle_block_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_cycle_block_id_fkey"
            columns: ["cycle_block_id"]
            isOneToOne: false
            referencedRelation: "cycle_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_disciplines: {
        Row: {
          blank: number
          correct: number
          discipline_id: string
          id: string
          questions: number
          simulado_id: string
          weight: number
          wrong: number
        }
        Insert: {
          blank?: number
          correct?: number
          discipline_id: string
          id?: string
          questions?: number
          simulado_id: string
          weight?: number
          wrong?: number
        }
        Update: {
          blank?: number
          correct?: number
          discipline_id?: string
          id?: string
          questions?: number
          simulado_id?: string
          weight?: number
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulado_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulado_disciplines_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          banca: string
          created_at: string
          date: string
          has_p2: boolean
          id: string
          meta_percent: number
          p1_disciplines: string[] | null
          p1_min_percent: number
          p2_disciplines: string[] | null
          p2_min_percent: number
          total_min_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          banca?: string
          created_at?: string
          date: string
          has_p2?: boolean
          id?: string
          meta_percent?: number
          p1_disciplines?: string[] | null
          p1_min_percent?: number
          p2_disciplines?: string[] | null
          p2_min_percent?: number
          total_min_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          banca?: string
          created_at?: string
          date?: string
          has_p2?: boolean
          id?: string
          meta_percent?: number
          p1_disciplines?: string[] | null
          p1_min_percent?: number
          p2_disciplines?: string[] | null
          p2_min_percent?: number
          total_min_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_cycles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          study_days: number[]
          updated_at: string
          user_id: string
          weekly_hours: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          study_days?: number[]
          updated_at?: string
          user_id: string
          weekly_hours?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          study_days?: number[]
          updated_at?: string
          user_id?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      study_records: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          blank_answers: number
          correct_answers: number
          created_at: string
          date: string
          discipline_id: string
          duration_seconds: number
          id: string
          notes: string | null
          pages_read: number
          topics_completed: string[] | null
          turno: Database["public"]["Enums"]["turno_type"]
          updated_at: string
          user_id: string
          wrong_answers: number
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          blank_answers?: number
          correct_answers?: number
          created_at?: string
          date: string
          discipline_id: string
          duration_seconds?: number
          id?: string
          notes?: string | null
          pages_read?: number
          topics_completed?: string[] | null
          turno?: Database["public"]["Enums"]["turno_type"]
          updated_at?: string
          user_id: string
          wrong_answers?: number
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          blank_answers?: number
          correct_answers?: number
          created_at?: string
          date?: string
          discipline_id?: string
          duration_seconds?: number
          id?: string
          notes?: string | null
          pages_read?: number
          topics_completed?: string[] | null
          turno?: Database["public"]["Enums"]["turno_type"]
          updated_at?: string
          user_id?: string
          wrong_answers?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_records_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          completed: boolean
          created_at: string
          discipline_id: string
          id: string
          sort_order: number
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          discipline_id: string
          id?: string
          sort_order?: number
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          discipline_id?: string
          id?: string
          sort_order?: number
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          candidate_name: string | null
          contest_name: string | null
          contest_organ: string | null
          created_at: string
          daily_pages: number | null
          daily_questions: number | null
          exam_date: string | null
          id: string
          last_study_date: string | null
          module_hints: Json | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          phases: Json | null
          reminder_minutes_before: number | null
          revision_enabled: boolean | null
          revision_marks: string[] | null
          setup_completed: boolean | null
          streak: number | null
          study_days: number[] | null
          total_min_percent: number | null
          updated_at: string
          user_id: string
          vacancies: number | null
          weekly_hours: number | null
        }
        Insert: {
          candidate_name?: string | null
          contest_name?: string | null
          contest_organ?: string | null
          created_at?: string
          daily_pages?: number | null
          daily_questions?: number | null
          exam_date?: string | null
          id?: string
          last_study_date?: string | null
          module_hints?: Json | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phases?: Json | null
          reminder_minutes_before?: number | null
          revision_enabled?: boolean | null
          revision_marks?: string[] | null
          setup_completed?: boolean | null
          streak?: number | null
          study_days?: number[] | null
          total_min_percent?: number | null
          updated_at?: string
          user_id: string
          vacancies?: number | null
          weekly_hours?: number | null
        }
        Update: {
          candidate_name?: string | null
          contest_name?: string | null
          contest_organ?: string | null
          created_at?: string
          daily_pages?: number | null
          daily_questions?: number | null
          exam_date?: string | null
          id?: string
          last_study_date?: string | null
          module_hints?: Json | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phases?: Json | null
          reminder_minutes_before?: number | null
          revision_enabled?: boolean | null
          revision_marks?: string[] | null
          setup_completed?: boolean | null
          streak?: number | null
          study_days?: number[] | null
          total_min_percent?: number | null
          updated_at?: string
          user_id?: string
          vacancies?: number | null
          weekly_hours?: number | null
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
      activity_type: "estudo" | "revisao" | "exercicios" | "leitura"
      difficulty_level:
        | "muita_facilidade"
        | "leve_facilidade"
        | "normal"
        | "leve_dificuldade"
        | "muita_dificuldade"
      discipline_category: "exatas" | "humanas" | "juridicas" | "mista"
      importance_level: "alta" | "media" | "baixa"
      revision_mark: "24h" | "7d" | "30d" | "60d"
      turno_type: "madrugada" | "manha" | "tarde" | "noite"
      user_situation: "nunca_estudei" | "razoavelmente" | "ja_estudei"
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
      activity_type: ["estudo", "revisao", "exercicios", "leitura"],
      difficulty_level: [
        "muita_facilidade",
        "leve_facilidade",
        "normal",
        "leve_dificuldade",
        "muita_dificuldade",
      ],
      discipline_category: ["exatas", "humanas", "juridicas", "mista"],
      importance_level: ["alta", "media", "baixa"],
      revision_mark: ["24h", "7d", "30d", "60d"],
      turno_type: ["madrugada", "manha", "tarde", "noite"],
      user_situation: ["nunca_estudei", "razoavelmente", "ja_estudei"],
    },
  },
} as const
