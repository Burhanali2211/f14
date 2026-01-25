export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ahlul_bait_events: {
        Row: {
          id: string
          imam_id: string
          event_type: "birthday" | "death" | "martyrdom" | "other"
          event_date: string
          event_name: string
          description: string | null
          is_annual: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          imam_id: string
          event_type: "birthday" | "death" | "martyrdom" | "other"
          event_date: string
          event_name: string
          description?: string | null
          is_annual?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          imam_id?: string
          event_type?: "birthday" | "death" | "martyrdom" | "other"
          event_date?: string
          event_name?: string
          description?: string | null
          is_annual?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ahlul_bait_events_imam_id_fkey"
            columns: ["imam_id"]
            isOneToOne: false
            referencedRelation: "imams"
            referencedColumns: ["id"]
          }
        ]
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string
          created_by: string | null
          sent_at: string | null
          event_type: "birthday" | "death" | "martyrdom" | "other" | "general" | null
          imam_id: string | null
          event_date: string | null
          hijri_date: string | null
          template_data: Json | null
          thumbnail_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          created_by?: string | null
          sent_at?: string | null
          event_type?: "birthday" | "death" | "martyrdom" | "other" | "general" | null
          imam_id?: string | null
          event_date?: string | null
          hijri_date?: string | null
          template_data?: Json | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          created_by?: string | null
          sent_at?: string | null
          event_type?: "birthday" | "death" | "martyrdom" | "other" | "general" | null
          imam_id?: string | null
          event_date?: string | null
          hijri_date?: string | null
          template_data?: Json | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_imam_id_fkey"
            columns: ["imam_id"]
            isOneToOne: false
            referencedRelation: "imams"
            referencedColumns: ["id"]
          }
        ]
      }
      artistes: {
        Row: {
          id: string
          name: string
          slug: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
categories: {
          Row: {
            id: string
            name: string
            slug: string
            description: string | null
            icon: string | null
            custom_path: string | null
            bg_image_url: string | null
            bg_image_position: string | null
            bg_image_size: string | null
            bg_image_opacity: number | null
            bg_image_blur: number | null
            bg_image_scale: number | null
            created_at: string | null
          }
          Insert: {
            id?: string
            name: string
            slug: string
            description?: string | null
            icon?: string | null
            custom_path?: string | null
            bg_image_url?: string | null
            bg_image_position?: string | null
            bg_image_size?: string | null
            bg_image_opacity?: number | null
            bg_image_blur?: number | null
            bg_image_scale?: number | null
            created_at?: string | null
          }
          Update: {
            id?: string
            name?: string
            slug?: string
            description?: string | null
            icon?: string | null
            custom_path?: string | null
            bg_image_url?: string | null
            bg_image_position?: string | null
            bg_image_size?: string | null
            bg_image_opacity?: number | null
            bg_image_blur?: number | null
            bg_image_scale?: number | null
            created_at?: string | null
          }
          Relationships: []
        }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          subject: string | null
          message: string
          status: "unread" | "read" | "replied" | "archived"
          admin_notes: string | null
          replied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          subject?: string | null
          message: string
          status?: "unread" | "read" | "replied" | "archived"
          admin_notes?: string | null
          replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          subject?: string | null
          message?: string
          status?: "unread" | "read" | "replied" | "archived"
          admin_notes?: string | null
          replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      earning_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            setting_key?: string
            setting_value?: Json
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        }
        figures: {
          Row: {
            id: string
            name: string
            slug: string
            description: string | null
            image_url: string | null
            created_at: string
          }
          Insert: {
            id?: string
            name: string
            slug: string
            description?: string | null
            image_url?: string | null
            created_at?: string
          }
          Update: {
            id?: string
            name?: string
            slug?: string
            description?: string | null
            image_url?: string | null
            created_at?: string
          }
          Relationships: []
        }
        fiqh_topics: {
          Row: {
            id: string
            name: string
            slug: string
            description: string | null
            icon: string | null
            order_index: number
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            name: string
            slug: string
            description?: string | null
            icon?: string | null
            order_index?: number
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            name?: string
            slug?: string
            description?: string | null
            icon?: string | null
            order_index?: number
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        }
        fiqh_questions: {
          Row: {
            id: string
            user_id: string | null
            topic_id: string | null
            subject: string
            question_text: string
            is_private: boolean | null
            status: string | null
            submitter_name: string | null
            submitter_email: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            user_id?: string | null
            topic_id?: string | null
            subject: string
            question_text: string
            is_private?: boolean | null
            status?: string | null
            submitter_name?: string | null
            submitter_email?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            user_id?: string | null
            topic_id?: string | null
            subject?: string
            question_text?: string
            is_private?: boolean | null
            status?: string | null
            submitter_name?: string | null
            submitter_email?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "fiqh_questions_topic_id_fkey"
              columns: ["topic_id"]
              isOneToOne: false
              referencedRelation: "fiqh_topics"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "fiqh_questions_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        }
        fiqh_answers: {
          Row: {
            id: string
            question_id: string
            answer_text: string
            answered_by: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            question_id: string
            answer_text: string
            answered_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            question_id?: string
            answer_text?: string
            answered_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "fiqh_answers_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: false
              referencedRelation: "fiqh_questions"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "fiqh_answers_answered_by_fkey"
              columns: ["answered_by"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        }
        fiqh_notifications: {
          Row: {
            id: string
            question_id: string
            user_id: string | null
            email: string | null
            type: string
            sent_at: string | null
            created_at: string
          }
          Insert: {
            id?: string
            question_id: string
            user_id?: string | null
            email?: string | null
            type: string
            sent_at?: string | null
            created_at?: string
          }
          Update: {
            id?: string
            question_id?: string
            user_id?: string | null
            email?: string | null
            type?: string
            sent_at?: string | null
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "fiqh_notifications_question_id_fkey"
              columns: ["question_id"]
              isOneToOne: false
              referencedRelation: "fiqh_questions"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "fiqh_notifications_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        }
        imams: {
          Row: {
            id: string
            name: string
            slug: string
            title: string | null
          description: string | null
          image_url: string | null
          order_index: number
          category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          order_index?: number
          category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          order_index?: number
          category_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      payout_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          status: "pending" | "approved" | "paid" | "rejected"
          payment_method: string | null
          payment_details: string | null
          notes: string | null
          admin_notes: string | null
          requested_at: string
          processed_at: string | null
          processed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          status?: "pending" | "approved" | "paid" | "rejected"
          payment_method?: string | null
          payment_details?: string | null
          notes?: string | null
          admin_notes?: string | null
          requested_at?: string
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          status?: "pending" | "approved" | "paid" | "rejected"
          payment_method?: string | null
          payment_details?: string | null
          notes?: string | null
          admin_notes?: string | null
          requested_at?: string
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pieces: {
        Row: {
          id: string
          title: string
          category_id: string
          imam_id: string | null
          user_id: string | null
          reciter: string | null
          language: string
          text_content: string
          video_url: string | null
          audio_url: string | null
          image_url: string | null
          tags: string[] | null
          view_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          category_id: string
          imam_id?: string | null
          user_id?: string | null
          reciter?: string | null
          language?: string
          text_content: string
          video_url?: string | null
          audio_url?: string | null
          image_url?: string | null
          tags?: string[] | null
          view_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          category_id?: string
          imam_id?: string | null
          user_id?: string | null
          reciter?: string | null
          language?: string
          text_content?: string
          video_url?: string | null
          audio_url?: string | null
          image_url?: string | null
          tags?: string[] | null
          view_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pieces_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pieces_imam_id_fkey"
            columns: ["imam_id"]
            isOneToOne: false
            referencedRelation: "imams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pieces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      site_settings: {
        Row: {
          id: string
          site_name: string
          site_tagline: string | null
          logo_url: string | null
          hero_image_url: string | null
          hero_gradient_opacity: number | null
          hero_image_opacity: number | null
          hero_gradient_preset: string | null
          hero_badge_text: string | null
          hero_heading_line1: string | null
          hero_heading_line2: string | null
          hero_description: string | null
          hero_text_color_mode: string | null
          hero_arabic_font: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_name: string
          site_tagline?: string | null
          logo_url?: string | null
          hero_image_url?: string | null
          hero_gradient_opacity?: number | null
          hero_image_opacity?: number | null
          hero_gradient_preset?: string | null
          hero_badge_text?: string | null
          hero_heading_line1?: string | null
          hero_heading_line2?: string | null
          hero_description?: string | null
          hero_text_color_mode?: string | null
          hero_arabic_font?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_name?: string
          site_tagline?: string | null
          logo_url?: string | null
          hero_image_url?: string | null
          hero_gradient_opacity?: number | null
          hero_image_opacity?: number | null
          hero_gradient_preset?: string | null
          hero_badge_text?: string | null
          hero_heading_line1?: string | null
          hero_heading_line2?: string | null
          hero_description?: string | null
          hero_text_color_mode?: string | null
          hero_arabic_font?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploader_earnings: {
        Row: {
          id: string
          user_id: string
          total_recitations: number
          total_earnings: number
          pending_payout: number
          paid_out: number
          current_streak: number
          longest_streak: number
          last_upload_date: string | null
          milestones_achieved: string[]
          weekly_uploads: Json
          monthly_uploads: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_recitations?: number
          total_earnings?: number
          pending_payout?: number
          paid_out?: number
          current_streak?: number
          longest_streak?: number
          last_upload_date?: string | null
          milestones_achieved?: string[]
          weekly_uploads?: Json
          monthly_uploads?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_recitations?: number
          total_earnings?: number
          pending_payout?: number
          paid_out?: number
          current_streak?: number
          longest_streak?: number
          last_upload_date?: string | null
          milestones_achieved?: string[]
          weekly_uploads?: Json
          monthly_uploads?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploader_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_payment_details: {
        Row: {
          id: string
          user_id: string
          payment_method: "upi" | "bank" | "paytm"
          payment_details: string
          account_holder_name: string | null
          ifsc_code: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payment_method: "upi" | "bank" | "paytm"
          payment_details: string
          account_holder_name?: string | null
          ifsc_code?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          payment_method?: "upi" | "bank" | "paytm"
          payment_details?: string
          account_holder_name?: string | null
          ifsc_code?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payment_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          full_name: string | null
          phone_number: string | null
          address: string | null
          avatar_url: string | null
          role: "admin" | "uploader" | "user"
          is_active: boolean
          notifications_enabled: boolean
          notification_permission_granted: boolean
          notification_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          full_name?: string | null
          phone_number?: string | null
          address?: string | null
          avatar_url?: string | null
          role?: "admin" | "uploader" | "user"
          is_active?: boolean
          notifications_enabled?: boolean
          notification_permission_granted?: boolean
          notification_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          full_name?: string | null
          phone_number?: string | null
          address?: string | null
          avatar_url?: string | null
          role?: "admin" | "uploader" | "user"
          is_active?: boolean
          notifications_enabled?: boolean
          notification_permission_granted?: boolean
          notification_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view_count: { Args: { piece_id: string }; Returns: undefined }
    }
    Enums: {
      event_type: "birthday" | "death" | "martyrdom" | "other"
      user_role: "admin" | "uploader" | "user"
      contact_status: "unread" | "read" | "replied" | "archived"
      payout_status: "pending" | "approved" | "paid" | "rejected"
      payment_method: "upi" | "bank" | "paytm"
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
