export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      deck_memberships: {
        Row: {
          created_at: string
          deck_id: string
          learner_id: string
          vocabulary_item_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          learner_id: string
          vocabulary_item_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          learner_id?: string
          vocabulary_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_memberships_deck_owner"
            columns: ["deck_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "deck_memberships_item_owner"
            columns: ["vocabulary_item_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "deck_memberships_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          owner_id: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          name: string
          owner_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          owner_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_runs: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          id: string
          learner_id: string
          model: string
          output: Json | null
          provider: string
          schema_version: string
          started_at: string | null
          status: string
          vocabulary_encounter_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          learner_id: string
          model: string
          output?: Json | null
          provider: string
          schema_version: string
          started_at?: string | null
          status?: string
          vocabulary_encounter_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          learner_id?: string
          model?: string
          output?: Json | null
          provider?: string
          schema_version?: string
          started_at?: string | null
          status?: string
          vocabulary_encounter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_runs_encounter_owner"
            columns: ["vocabulary_encounter_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_encounters"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "enrichment_runs_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_usage_events: {
        Row: {
          id: string
          idempotency_key: string
          learner_id: string
          occurred_at: string
          quantity: number
          successful_enrichment_id: string | null
          usage_kind: string
        }
        Insert: {
          id?: string
          idempotency_key: string
          learner_id: string
          occurred_at?: string
          quantity: number
          successful_enrichment_id?: string | null
          usage_kind: string
        }
        Update: {
          id?: string
          idempotency_key?: string
          learner_id?: string
          occurred_at?: string
          quantity?: number
          successful_enrichment_id?: string | null
          usage_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_usage_events_enrichment_owner"
            columns: ["successful_enrichment_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "enrichment_runs"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "entitlement_usage_events_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_day_rollups: {
        Row: {
          completed_at: string | null
          due_at_day_start: number
          due_completed: number
          honest_reviews: number
          learner_day: string
          learner_id: string
          updated_at: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          due_at_day_start?: number
          due_completed?: number
          honest_reviews?: number
          learner_day: string
          learner_id: string
          updated_at?: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          due_at_day_start?: number
          due_completed?: number
          honest_reviews?: number
          learner_day?: string
          learner_id?: string
          updated_at?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "learner_day_rollups_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_starter_decks: {
        Row: {
          adopted_at: string
          deck_kind: string
          learner_id: string
          removed_at: string | null
          starter_deck_id: string
          state: string
        }
        Insert: {
          adopted_at?: string
          deck_kind?: string
          learner_id: string
          removed_at?: string | null
          starter_deck_id: string
          state?: string
        }
        Update: {
          adopted_at?: string
          deck_kind?: string
          learner_id?: string
          removed_at?: string | null
          starter_deck_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_starter_decks_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_starter_decks_starter_only"
            columns: ["starter_deck_id", "deck_kind"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      learners: {
        Row: {
          avatar_url: string | null
          created_at: string
          deletion_requested_at: string | null
          display_name: string | null
          id: string
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          id: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          display_name?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_materials: {
        Row: {
          accepted_at: string | null
          content: Json
          created_at: string
          id: string
          learner_id: string
          material_type: string
          provenance: Json
          source_type: string
          superseded_at: string | null
          version: number
          vocabulary_item_id: string
        }
        Insert: {
          accepted_at?: string | null
          content: Json
          created_at?: string
          id?: string
          learner_id: string
          material_type: string
          provenance?: Json
          source_type: string
          superseded_at?: string | null
          version?: number
          vocabulary_item_id: string
        }
        Update: {
          accepted_at?: string | null
          content?: Json
          created_at?: string
          id?: string
          learner_id?: string
          material_type?: string
          provenance?: Json
          source_type?: string
          superseded_at?: string | null
          version?: number
          vocabulary_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_materials_item_owner"
            columns: ["vocabulary_item_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "learning_materials_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      lexical_evidence: {
        Row: {
          evidence: Json
          id: number
          imported_at: string
          lexical_sense_id: number
          license_code: string
          source_name: string
          source_record_id: string | null
          source_version: string
        }
        Insert: {
          evidence?: Json
          id?: never
          imported_at?: string
          lexical_sense_id: number
          license_code: string
          source_name: string
          source_record_id?: string | null
          source_version: string
        }
        Update: {
          evidence?: Json
          id?: never
          imported_at?: string
          lexical_sense_id?: number
          license_code?: string
          source_name?: string
          source_record_id?: string | null
          source_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexical_evidence_lexical_sense_id_fkey"
            columns: ["lexical_sense_id"]
            isOneToOne: false
            referencedRelation: "lexical_senses"
            referencedColumns: ["id"]
          },
        ]
      }
      lexical_senses: {
        Row: {
          created_at: string
          definition_en: string | null
          id: number
          lexical_unit_id: number
          part_of_speech: string
          sense_key: string
        }
        Insert: {
          created_at?: string
          definition_en?: string | null
          id?: never
          lexical_unit_id: number
          part_of_speech: string
          sense_key: string
        }
        Update: {
          created_at?: string
          definition_en?: string | null
          id?: never
          lexical_unit_id?: number
          part_of_speech?: string
          sense_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "lexical_senses_lexical_unit_id_fkey"
            columns: ["lexical_unit_id"]
            isOneToOne: false
            referencedRelation: "lexical_units"
            referencedColumns: ["id"]
          },
        ]
      }
      lexical_units: {
        Row: {
          canonical_form: string
          created_at: string
          id: number
          kind: string
          language_code: string
          normalized_form: string
        }
        Insert: {
          canonical_form: string
          created_at?: string
          id?: never
          kind?: string
          language_code?: string
          normalized_form: string
        }
        Update: {
          canonical_form?: string
          created_at?: string
          id?: never
          kind?: string
          language_code?: string
          normalized_form?: string
        }
        Relationships: []
      }
      memory_tracks: {
        Row: {
          created_at: string
          difficulty: number | null
          due_at: string | null
          elapsed_days: number
          id: string
          lapses: number
          last_reviewed_at: string | null
          learner_id: string
          practice_direction: string
          repetitions: number
          scheduled_days: number
          scheduler_policy_id: string
          scheduler_state: string
          stability: number | null
          suspended_at: string | null
          updated_at: string
          version: number
          vocabulary_item_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due_at?: string | null
          elapsed_days?: number
          id?: string
          lapses?: number
          last_reviewed_at?: string | null
          learner_id: string
          practice_direction: string
          repetitions?: number
          scheduled_days?: number
          scheduler_policy_id: string
          scheduler_state?: string
          stability?: number | null
          suspended_at?: string | null
          updated_at?: string
          version?: number
          vocabulary_item_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due_at?: string | null
          elapsed_days?: number
          id?: string
          lapses?: number
          last_reviewed_at?: string | null
          learner_id?: string
          practice_direction?: string
          repetitions?: number
          scheduled_days?: number
          scheduler_policy_id?: string
          scheduler_state?: string
          stability?: number | null
          suspended_at?: string | null
          updated_at?: string
          version?: number
          vocabulary_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_tracks_item_owner"
            columns: ["vocabulary_item_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "memory_tracks_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_tracks_scheduler_policy_id_fkey"
            columns: ["scheduler_policy_id"]
            isOneToOne: false
            referencedRelation: "scheduler_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      motivation_events: {
        Row: {
          event_kind: string
          id: string
          idempotency_key: string
          learner_day: string
          learner_id: string
          metadata: Json
          occurred_at: string
          review_event_id: string | null
          xp_delta: number
        }
        Insert: {
          event_kind: string
          id?: string
          idempotency_key: string
          learner_day: string
          learner_id: string
          metadata?: Json
          occurred_at?: string
          review_event_id?: string | null
          xp_delta?: number
        }
        Update: {
          event_kind?: string
          id?: string
          idempotency_key?: string
          learner_day?: string
          learner_id?: string
          metadata?: Json
          occurred_at?: string
          review_event_id?: string | null
          xp_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "motivation_events_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motivation_events_review_owner"
            columns: ["review_event_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "review_events"
            referencedColumns: ["id", "learner_id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          available_at: string
          created_at: string
          event_type: string
          id: string
          last_error_code: string | null
          learner_id: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          processed_at: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempt_count?: number
          available_at?: string
          created_at?: string
          event_type: string
          id?: string
          last_error_code?: string | null
          learner_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload: Json
          processed_at?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempt_count?: number
          available_at?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error_code?: string | null
          learner_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      review_event_corrections: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          reason: string
          replacement_review_event_id: string | null
          review_event_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          reason: string
          replacement_review_event_id?: string | null
          review_event_id: string
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          reason?: string
          replacement_review_event_id?: string | null
          review_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_event_corrections_event_owner"
            columns: ["review_event_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "review_events"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "review_event_corrections_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_event_corrections_replacement_owner"
            columns: ["replacement_review_event_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "review_events"
            referencedColumns: ["id", "learner_id"]
          },
        ]
      }
      review_events: {
        Row: {
          created_at: string
          id: string
          learner_day: string
          learner_id: string
          memory_track_id: string
          prior_state: Json
          resulting_state: Json
          review_outcome: string
          reviewed_at: string
          scheduler_policy_id: string
          track_version_after: number
          track_version_before: number
        }
        Insert: {
          created_at?: string
          id?: string
          learner_day: string
          learner_id: string
          memory_track_id: string
          prior_state: Json
          resulting_state: Json
          review_outcome: string
          reviewed_at: string
          scheduler_policy_id: string
          track_version_after: number
          track_version_before: number
        }
        Update: {
          created_at?: string
          id?: string
          learner_day?: string
          learner_id?: string
          memory_track_id?: string
          prior_state?: Json
          resulting_state?: Json
          review_outcome?: string
          reviewed_at?: string
          scheduler_policy_id?: string
          track_version_after?: number
          track_version_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_events_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_events_scheduler_policy_id_fkey"
            columns: ["scheduler_policy_id"]
            isOneToOne: false
            referencedRelation: "scheduler_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_events_track_owner"
            columns: ["memory_track_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "memory_tracks"
            referencedColumns: ["id", "learner_id"]
          },
        ]
      }
      scheduler_policies: {
        Row: {
          active_from: string
          algorithm: string
          algorithm_version: string
          desired_retention: number
          id: string
          parameters: Json
          relearning_steps_seconds: number[]
          retired_at: string | null
        }
        Insert: {
          active_from: string
          algorithm: string
          algorithm_version: string
          desired_retention: number
          id: string
          parameters: Json
          relearning_steps_seconds: number[]
          retired_at?: string | null
        }
        Update: {
          active_from?: string
          algorithm?: string
          algorithm_version?: string
          desired_retention?: number
          id?: string
          parameters?: Json
          relearning_steps_seconds?: number[]
          retired_at?: string | null
        }
        Relationships: []
      }
      starter_deck_entries: {
        Row: {
          created_at: string
          curated_context: string
          curated_meaning_vi: string
          deck_id: string
          deck_kind: string
          lexical_sense_id: number
          position: number
        }
        Insert: {
          created_at?: string
          curated_context: string
          curated_meaning_vi: string
          deck_id: string
          deck_kind?: string
          lexical_sense_id: number
          position: number
        }
        Update: {
          created_at?: string
          curated_context?: string
          curated_meaning_vi?: string
          deck_id?: string
          deck_kind?: string
          lexical_sense_id?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "starter_deck_entries_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "starter_deck_entries_lexical_sense_id_fkey"
            columns: ["lexical_sense_id"]
            isOneToOne: false
            referencedRelation: "lexical_senses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "starter_deck_entries_starter_only"
            columns: ["deck_id", "deck_kind"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      vocabulary_encounters: {
        Row: {
          capture_method: string
          captured_at: string
          context_text: string | null
          enrichment_state: string
          id: string
          idempotency_key: string
          learner_id: string
          linked_at: string | null
          requested_deck_id: string | null
          source_title: string | null
          source_url: string | null
          surface_form: string
          vocabulary_item_id: string | null
        }
        Insert: {
          capture_method: string
          captured_at?: string
          context_text?: string | null
          enrichment_state?: string
          id?: string
          idempotency_key: string
          learner_id: string
          linked_at?: string | null
          requested_deck_id?: string | null
          source_title?: string | null
          source_url?: string | null
          surface_form: string
          vocabulary_item_id?: string | null
        }
        Update: {
          capture_method?: string
          captured_at?: string
          context_text?: string | null
          enrichment_state?: string
          id?: string
          idempotency_key?: string
          learner_id?: string
          linked_at?: string | null
          requested_deck_id?: string | null
          source_title?: string | null
          source_url?: string | null
          surface_form?: string
          vocabulary_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_encounters_deck_owner"
            columns: ["requested_deck_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "vocabulary_encounters_item_owner"
            columns: ["vocabulary_item_id", "learner_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id", "learner_id"]
          },
          {
            foreignKeyName: "vocabulary_encounters_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_items: {
        Row: {
          archived_at: string | null
          contextual_meaning_vi: string
          created_at: string
          id: string
          learner_id: string
          lexical_sense_id: number
          lexical_unit_id: number
          primary_context: string
          state: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contextual_meaning_vi: string
          created_at?: string
          id?: string
          learner_id: string
          lexical_sense_id: number
          lexical_unit_id: number
          primary_context: string
          state?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contextual_meaning_vi?: string
          created_at?: string
          id?: string
          learner_id?: string
          lexical_sense_id?: number
          lexical_unit_id?: number
          primary_context?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_items_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_items_lexical_unit_id_fkey"
            columns: ["lexical_unit_id"]
            isOneToOne: false
            referencedRelation: "lexical_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_items_sense_matches_unit"
            columns: ["lexical_sense_id", "lexical_unit_id"]
            isOneToOne: false
            referencedRelation: "lexical_senses"
            referencedColumns: ["id", "lexical_unit_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adopt_starter_deck: {
        Args: { p_learner_id: string; p_starter_deck_id: string }
        Returns: boolean
      }
      capture_vocabulary_encounter: {
        Args: {
          p_capture_method: string
          p_captured_at: string
          p_context_text: string
          p_idempotency_key: string
          p_learner_id: string
          p_requested_deck_id: string
          p_source_title: string
          p_source_url: string
          p_surface_form: string
        }
        Returns: string
      }
      commit_review_event: {
        Args: {
          p_expected_version: number
          p_learner_id: string
          p_memory_track_id: string
          p_resulting_state: Json
          p_review_outcome: string
          p_scheduler_policy_id: string
        }
        Returns: string
      }
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

