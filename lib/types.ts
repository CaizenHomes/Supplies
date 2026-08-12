// Generated from the live "Supplies" Supabase project schema.
// Regenerate via the Supabase MCP generate_typescript_types tool after any migration change —
// do not hand-edit.

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      budget_settings: {
        Row: {
          amount: number
          created_at: string
          effective_from: string
          id: string
          set_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          effective_from?: string
          id?: string
          set_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          effective_from?: string
          id?: string
          set_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_settings_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_month?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          link?: string | null
          name: string
          ordered_at?: string | null
          ordered_by?: string | null
          over_budget_reason?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          qty: number
          receipt_path?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at?: string
          vendor: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_month?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          link?: string | null
          name?: string
          ordered_at?: string | null
          ordered_by?: string | null
          over_budget_reason?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          qty?: number
          receipt_path?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["item_status"]
          unit_price?: number
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          item_id: string | null
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          message?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      items_detailed: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_name: string | null
          checked_at: string | null
          checked_by: string | null
          checked_by_name: string | null
          created_at: string | null
          id: string | null
          link: string | null
          name: string | null
          ordered_at: string | null
          ordered_by: string | null
          ordered_by_name: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          promoted_by_name: string | null
          qty: number | null
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_by_name: string | null
          requested_at: string | null
          requested_by: string | null
          requested_by_name: string | null
          status: Database["public"]["Enums"]["item_status"] | null
          total: number | null
          unit_price: number | null
          updated_at: string | null
          vendor: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_item: {
        Args: { p_item_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_item: {
        Args: { p_item_id: string; p_reason?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_budget_amount: { Args: never; Returns: number }
      current_profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      mark_ordered: {
        Args: { p_item_id: string; p_receipt_path: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_received: {
        Args: { p_checked_by: string; p_item_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      promote_item: {
        Args: { p_item_id: string; p_reason?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_item: {
        Args: { p_item_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          budget_month: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          ordered_at: string | null
          ordered_by: string | null
          over_budget_reason: string | null
          promoted_at: string | null
          promoted_by: string | null
          qty: number
          receipt_path: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
          vendor: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      item_status:
        | "wishlist"
        | "pending_approval"
        | "in_list"
        | "ordered"
        | "received"
        | "rejected"
        | "cancelled"
      notification_type: "wish_promoted" | "approval_needed" | "item_received"
      user_role: "executive" | "manager" | "staff"
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
      item_status: [
        "wishlist",
        "pending_approval",
        "in_list",
        "ordered",
        "received",
        "rejected",
        "cancelled",
      ],
      notification_type: ["wish_promoted", "approval_needed", "item_received"],
      user_role: ["executive", "manager", "staff"],
    },
  },
} as const
