// Tipe baris database (mirror supabase/schema.sql, tanpa codegen).
export type AppRole = "admin" | "editor" | "viewer";
export type DbContentStatus =
  | "idea"
  | "draft"
  | "review"
  | "revision"
  | "approved"
  | "scheduled"
  | "published";
export type DbContentType = "feed" | "carousel" | "reels" | "story";
export type DbMediaKind = "image" | "video";

export type DbContent = {
  id: string;
  title: string;
  type: DbContentType;
  status: DbContentStatus;
  scheduled_date: string;
  scheduled_time: string;
  pic_name: string;
  pic_initials: string;
  caption: string;
  hashtags: string;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
  slides: number | null;
};

export type DbStatusHistory = {
  id: string;
  content_id: string;
  status: DbContentStatus;
  changed_at: string;
  changed_by: string | null;
};

export type DbComment = {
  id: string;
  content_id: string;
  author_name: string;
  author_id: string | null;
  text: string;
  created_at: string;
};

export type DbProfile = {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: AppRole;
  active: boolean;
  joined_at: string;
};
