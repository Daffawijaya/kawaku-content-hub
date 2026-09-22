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
export type DbPostRole = "owner" | "collaborator";
export type DbMediaKind = "image" | "video";

export type DbContent = {
  id: string;
  title: string;
  type: DbContentType;
  status: DbContentStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  pic_name: string;
  pic_initials: string;
  caption: string;
  hashtags: string;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
  slides: number | null;
  ig_media_id: string | null;
  published_url: string | null;
  ig_sync_error: string | null;
  ig_user_tags: string;
  ig_collaborators: string;
  ig_location_id: string | null;
  ig_location_name: string | null;
  ig_alt_text: string;
  post_role: DbPostRole | null;
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

export type DbTeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  active: boolean;
  joined_at: string;
  user_id: string | null;
};

export type DbProfile = {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatar_url: string | null;
  role: AppRole;
  active: boolean;
  joined_at: string;
};
