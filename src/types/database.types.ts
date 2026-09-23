export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          active: boolean
          code: string
          description: string
          icon: string
          id: string
          name: string
          position: number
        }
        Insert: {
          active?: boolean
          code: string
          description: string
          icon: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          active?: boolean
          code?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_settings: {
        Row: {
          description: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      learning_path_departments: {
        Row: {
          created_at: string
          department_id: string
          learning_path_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          learning_path_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          learning_path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_departments_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          owner_department_id: string | null
          position: number
          published_at: string | null
          required: boolean
          sequential: boolean
          slug: string
          status: Database["public"]["Enums"]["path_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          owner_department_id?: string | null
          position?: number
          published_at?: string | null
          required?: boolean
          sequential?: boolean
          slug: string
          status?: Database["public"]["Enums"]["path_status"]
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          owner_department_id?: string | null
          position?: number
          published_at?: string | null
          required?: boolean
          sequential?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["path_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_paths_owner_department_id_fkey"
            columns: ["owner_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          last_accessed_at: string
          lesson_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          content_type: Database["public"]["Enums"]["lesson_type"]
          created_at: string
          description: string | null
          estimated_minutes: number | null
          external_url: string | null
          file_path: string | null
          id: string
          module_id: string
          position: number
          published: boolean
          required: boolean
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          content?: string | null
          content_type: Database["public"]["Enums"]["lesson_type"]
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          module_id: string
          position: number
          published?: boolean
          required?: boolean
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          content?: string | null
          content_type?: Database["public"]["Enums"]["lesson_type"]
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          module_id?: string
          position?: number
          published?: boolean
          required?: boolean
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          level: number
          min_xp: number
          name: string | null
        }
        Insert: {
          level: number
          min_xp: number
          name?: string | null
        }
        Update: {
          level?: number
          min_xp?: number
          name?: string | null
        }
        Relationships: []
      }
      module_completions: {
        Row: {
          completed_at: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          learning_path_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          learning_path_id: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          learning_path_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          hire_date: string | null
          id: string
          job_title: string | null
          last_seen_at: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          hire_date?: string | null
          id: string
          job_title?: string | null
          last_seen_at?: string | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          attempt_id: string
          is_correct: boolean
          option_id: string | null
          question_id: string
        }
        Insert: {
          attempt_id: string
          is_correct: boolean
          option_id?: string | null
          question_id: string
        }
        Update: {
          attempt_id?: string
          is_correct?: boolean
          option_id?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string
          correct_count: number
          id: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          correct_count: number
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          started_at?: string | null
          total_questions: number
          user_id: string
        }
        Update: {
          completed_at?: string
          correct_count?: number
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          explanation: string | null
          id: string
          position: number
          question: string
          quiz_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          explanation?: string | null
          id?: string
          position: number
          question: string
          quiz_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          explanation?: string | null
          id?: string
          position?: number
          question?: string
          quiz_id?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          passing_score: number
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          passing_score?: number
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          passing_score?: number
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_paths: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_individually: boolean
          completed_at: string | null
          created_at: string
          id: string
          learning_path_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_individually?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          learning_path_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_individually?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          learning_path_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_paths_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_paths_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_paths_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["xp_reason"]
          reference_id: string
          reference_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: Database["public"]["Enums"]["xp_reason"]
          reference_id: string
          reference_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: Database["public"]["Enums"]["xp_reason"]
          reference_id?: string
          reference_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      lesson_type: "text" | "video" | "pdf" | "link" | "embed"
      path_status: "draft" | "published" | "archived"
      question_type: "multiple_choice" | "true_false"
      user_role: "member" | "admin"
      xp_reason:
        | "lesson_completed"
        | "quiz_passed"
        | "quiz_perfect"
        | "module_completed"
        | "path_completed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      lesson_type: ["text", "video", "pdf", "link", "embed"],
      path_status: ["draft", "published", "archived"],
      question_type: ["multiple_choice", "true_false"],
      user_role: ["member", "admin"],
      xp_reason: [
        "lesson_completed",
        "quiz_passed",
        "quiz_perfect",
        "module_completed",
        "path_completed",
      ],
    },
  },
} as const

