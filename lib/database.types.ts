export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      devotionals: {
        Row: {
          content: string;
          date: string | null;
          id: string;
          title: string;
        };
        Insert: {
          content: string;
          date?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          content?: string;
          date?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      event_info: {
        Row: {
          content: string | null;
          id: string;
          sort_order: number | null;
          title: string | null;
          type: "rundown" | "rules" | "contact";
        };
        Insert: {
          content?: string | null;
          id?: string;
          sort_order?: number | null;
          title?: string | null;
          type: "rundown" | "rules" | "contact";
        };
        Update: {
          content?: string | null;
          id?: string;
          sort_order?: number | null;
          title?: string | null;
          type?: "rundown" | "rules" | "contact";
        };
        Relationships: [];
      };
      event_settings: {
        Row: {
          end_date: string | null;
          event_name: string;
          id: number;
          start_date: string | null;
        };
        Insert: {
          end_date?: string | null;
          event_name?: string;
          id?: number;
          start_date?: string | null;
        };
        Update: {
          end_date?: string | null;
          event_name?: string;
          id?: number;
          start_date?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          created_at: string | null;
          friend_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          friend_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          friend_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey";
            columns: ["friend_id"];
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
          {
            foreignKeyName: "friendships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      groups: {
        Row: {
          color: string | null;
          created_at: string | null;
          id: string;
          name: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      kirim_salam_settings: {
        Row: {
          id: number;
          is_enabled: boolean;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          is_enabled?: boolean;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          is_enabled?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          church_id: string | null;
          church_other: string | null;
          created_at: string | null;
          full_name: string;
          group_id: string | null;
          id: string;
          qr_code: string;
          social_media: Json | null;
        };
        Insert: {
          avatar_url?: string | null;
          church_id?: string | null;
          church_other?: string | null;
          created_at?: string | null;
          full_name: string;
          group_id?: string | null;
          id: string;
          qr_code?: string;
          social_media?: Json | null;
        };
        Update: {
          avatar_url?: string | null;
          church_id?: string | null;
          church_other?: string | null;
          created_at?: string | null;
          full_name?: string;
          group_id?: string | null;
          id?: string;
          qr_code?: string;
          social_media?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "churches";
          },
          {
            foreignKeyName: "profiles_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "groups";
          },
        ];
      };
      songs: {
        Row: {
          id: string;
          lyrics: string;
          title: string;
          youtube_url: string | null;
        };
        Insert: {
          id?: string;
          lyrics: string;
          title: string;
          youtube_url?: string | null;
        };
        Update: {
          id?: string;
          lyrics?: string;
          title?: string;
          youtube_url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_friend_by_qr: {
        Args: {
          friend_qr_code: string;
        };
        Returns: {
          friend_id: string;
          full_name: string;
          success: boolean;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
