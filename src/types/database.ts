export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      collection_items: {
        Row: {
          ai_validation_prompt: string | null;
          collection_id: string;
          created_at: string;
          description: string | null;
          example_image_url: string | null;
          fun_fact: string | null;
          id: string;
          name: string;
          rarity: Database['public']['Enums']['item_rarity'];
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          ai_validation_prompt?: string | null;
          collection_id: string;
          created_at?: string;
          description?: string | null;
          example_image_url?: string | null;
          fun_fact?: string | null;
          id?: string;
          name: string;
          rarity?: Database['public']['Enums']['item_rarity'];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          ai_validation_prompt?: string | null;
          collection_id?: string;
          created_at?: string;
          description?: string | null;
          example_image_url?: string | null;
          fun_fact?: string | null;
          id?: string;
          name?: string;
          rarity?: Database['public']['Enums']['item_rarity'];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_items_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
        ];
      };
      collections: {
        Row: {
          ai_hint: string | null;
          category: Database['public']['Enums']['collection_category'] | null;
          cover_image_url: string | null;
          created_at: string;
          creator_id: string;
          description: string | null;
          icon: string | null;
          id: string;
          is_freeform: boolean;
          is_public: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          ai_hint?: string | null;
          category?: Database['public']['Enums']['collection_category'] | null;
          cover_image_url?: string | null;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_freeform?: boolean;
          is_public?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          ai_hint?: string | null;
          category?: Database['public']['Enums']['collection_category'] | null;
          cover_image_url?: string | null;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_freeform?: boolean;
          is_public?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collections_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      finds: {
        Row: {
          ai_cache_creation_tokens: number | null;
          ai_cache_read_tokens: number | null;
          ai_confidence: number | null;
          ai_input_tokens: number | null;
          ai_model: string | null;
          ai_notes: string | null;
          ai_output_tokens: number | null;
          ai_validated: boolean | null;
          collection_item_id: string;
          created_at: string;
          id: string;
          location_lat: number | null;
          location_lng: number | null;
          notes: string | null;
          photo_url: string;
          user_id: string;
        };
        Insert: {
          ai_cache_creation_tokens?: number | null;
          ai_cache_read_tokens?: number | null;
          ai_confidence?: number | null;
          ai_input_tokens?: number | null;
          ai_model?: string | null;
          ai_notes?: string | null;
          ai_output_tokens?: number | null;
          ai_validated?: boolean | null;
          collection_item_id: string;
          created_at?: string;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          photo_url: string;
          user_id: string;
        };
        Update: {
          ai_cache_creation_tokens?: number | null;
          ai_cache_read_tokens?: number | null;
          ai_confidence?: number | null;
          ai_input_tokens?: number | null;
          ai_model?: string | null;
          ai_notes?: string | null;
          ai_output_tokens?: number | null;
          ai_validated?: boolean | null;
          collection_item_id?: string;
          created_at?: string;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          photo_url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finds_collection_item_id_fkey';
            columns: ['collection_item_id'];
            isOneToOne: false;
            referencedRelation: 'collection_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'finds_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
          reporter_id: string;
          status: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          reporter_id: string;
          status?: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          reporter_id?: string;
          status?: Database['public']['Enums']['report_status'];
          target_id?: string;
          target_type?: Database['public']['Enums']['report_target'];
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reactions: {
        Row: {
          created_at: string;
          find_id: string;
          id: string;
          type: Database['public']['Enums']['reaction_type'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          find_id: string;
          id?: string;
          type: Database['public']['Enums']['reaction_type'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          find_id?: string;
          id?: string;
          type?: Database['public']['Enums']['reaction_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reactions_find_id_fkey';
            columns: ['find_id'];
            isOneToOne: false;
            referencedRelation: 'finds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_collections: {
        Row: {
          collection_id: string;
          id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          collection_id: string;
          id?: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          collection_id?: string;
          id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_collections_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_collections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          last_find_date: string | null;
          level: number;
          streak_days: number;
          updated_at: string;
          username: string;
          xp: number;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          last_find_date?: string | null;
          level?: number;
          streak_days?: number;
          updated_at?: string;
          username: string;
          xp?: number;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          last_find_date?: string | null;
          level?: number;
          streak_days?: number;
          updated_at?: string;
          username?: string;
          xp?: number;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          code: string;
          condition: Json;
          created_at: string;
          description: string;
          icon: string;
          id: string;
          sort_order: number;
          title: string;
          xp_reward: number;
        };
        Insert: {
          code: string;
          condition: Json;
          created_at?: string;
          description: string;
          icon: string;
          id?: string;
          sort_order?: number;
          title: string;
          xp_reward?: number;
        };
        Update: {
          code?: string;
          condition?: Json;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          sort_order?: number;
          title?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          ai_cache_creation_tokens: number | null;
          ai_cache_read_tokens: number | null;
          ai_input_tokens: number | null;
          ai_model: string | null;
          ai_output_tokens: number | null;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          ai_cache_creation_tokens?: number | null;
          ai_cache_read_tokens?: number | null;
          ai_input_tokens?: number | null;
          ai_model?: string | null;
          ai_output_tokens?: number | null;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          ai_cache_creation_tokens?: number | null;
          ai_cache_read_tokens?: number | null;
          ai_input_tokens?: number | null;
          ai_model?: string | null;
          ai_output_tokens?: number | null;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_personalized_feed: {
        Args: {
          viewer_lat: number | null;
          viewer_lng: number | null;
          page_size?: number;
          page_offset?: number;
        };
        Returns: {
          find_id: string;
          user_id: string;
          collection_id: string;
          collection_item_id: string;
          photo_url: string;
          location_lat: number | null;
          location_lng: number | null;
          notes: string | null;
          created_at: string;
          shared_collections: number;
          geo_score: number;
          reactions_count: number;
          score: number;
        }[];
      };
    };
    Enums: {
      collection_category:
        | 'nature'
        | 'urban'
        | 'animals'
        | 'food'
        | 'transport'
        | 'art'
        | 'sports'
        | 'visual'
        | 'seasonal'
        | 'travel';
      item_rarity: 'common' | 'uncommon' | 'rare';
      reaction_type: 'like' | 'fire' | 'wow';
      report_status: 'pending' | 'reviewed' | 'dismissed';
      report_target: 'collection' | 'find';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      collection_category: [
        'nature',
        'urban',
        'animals',
        'food',
        'transport',
        'art',
        'sports',
        'visual',
        'seasonal',
        'travel',
      ],
      item_rarity: ['common', 'uncommon', 'rare'],
      reaction_type: ['like', 'fire', 'wow'],
      report_status: ['pending', 'reviewed', 'dismissed'],
      report_target: ['collection', 'find'],
    },
  },
} as const;
