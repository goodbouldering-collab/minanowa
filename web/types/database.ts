// Supabase テーブルの snake_case 型定義（DB スキーマと一致させる）
// 自動生成は将来 `supabase gen types typescript` に置き換え予定

type MinanowaSchema = {
  Tables: {
      members: {
        Row: MemberRow;
        Insert: Omit<MemberRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<MemberRow>;
      };
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<EventRow>;
      };
      event_registrations: {
        Row: EventRegistrationRow;
        Insert: Omit<EventRegistrationRow, 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<EventRegistrationRow>;
      };
      blogs: {
        Row: BlogRow;
        Insert: Omit<BlogRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<BlogRow>;
      };
      boards: {
        Row: BoardRow;
        Insert: Omit<BoardRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<BoardRow>;
      };
      board_replies: {
        Row: BoardReplyRow;
        Insert: Omit<BoardReplyRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<BoardReplyRow>;
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: SiteSettingsRow;
        Update: Partial<SiteSettingsRow>;
      };
      operating_members: {
        Row: { member_id: string; sort_order: number };
        Insert: { member_id: string; sort_order: number };
        Update: Partial<{ member_id: string; sort_order: number }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
};

export type Database = {
  public: MinanowaSchema;
  minanowa: MinanowaSchema;
};

export type MemberRow = {
  id: string;
  email: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  business: string | null;
  business_category: string | null;
  introduction: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  sns: Record<string, string> | null;
  skills: string[] | null;
  join_date: string | null;
  is_public: boolean;
  is_admin: boolean;
  profession: string | null;
  homepage: string | null;
  google_map_url: string | null;
  role: string | null;
  map_lat: number | null;
  map_lng: number | null;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  description: string | null;
  detailed_info: string | null;
  participants: number | null;
  fee: string | null;
  image_url: string | null;
  is_past: boolean;
  application_url: string | null;
  reg_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  member_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  status: string;
  created_at: string;
};

export type BlogRow = {
  id: string;
  title: string;
  date: string;
  category: string | null;
  excerpt: string | null;
  content: string | null;
  author: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardRow = {
  id: string;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  title: string;
  content: string;
  category: string | null;
  mention_to_id: string | null;
  mention_to_name: string | null;
  created_at: string;
};

export type BoardReplyRow = {
  id: string;
  board_id: string;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
};

export type SiteSettingsRow = {
  id: number;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string | null;
  about_text: string | null;
  instagram_account: string | null;
  stripe_publishable_key: string | null;
  google_client_id: string | null;
  updated_at: string;
};
