// Mirrors committed migrations; regenerate with Supabase CLI when a linked project is available.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type DatasetRow = {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  row_count: number;
  column_count: number;
  analysis: Json;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      datasets: {
        Row: DatasetRow;
        Insert: Omit<DatasetRow, "created_at">;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "datasets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; name: string; description?: string | null };
        Update: { name?: string; description?: string | null };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: { id: string; email: string | null; created_at: string };
        Insert: { id: string; email?: string | null; created_at?: string };
        Update: { id?: string; email?: string | null; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_analysis: {
        Args: {
          p_project: string;
          p_dataset: string;
          p_filename: string;
          p_size: number;
          p_analysis: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
