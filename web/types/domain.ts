// アプリ内で使う camelCase 型（UI 層はこちらを使う）
// snake_case ↔ camelCase 変換は lib/supabase-mappers.ts に集約

export type Member = {
  id: string;
  email: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  business: string | null;
  businessCategory: string | null;
  introduction: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  sns: Record<string, string> | null;
  skills: string[] | null;
  joinDate: string | null;
  isPublic: boolean;
  isAdmin: boolean;
  profession: string | null;
  homepage: string | null;
  googleMapUrl: string | null;
  role: string | null;
  mapLat: number | null;
  mapLng: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Event = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  description: string | null;
  detailedInfo: string | null;
  participants: number | null;
  fee: string | null;
  imageUrl: string | null;
  isPast: boolean;
  applicationUrl: string | null;
  regDetails: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type EventRegistration = {
  id: string;
  eventId: string;
  memberId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  status: string;
  createdAt: string;
};

export type Blog = {
  id: string;
  title: string;
  date: string;
  category: string | null;
  excerpt: string | null;
  content: string | null;
  author: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string | null;
  title: string;
  content: string;
  category: string | null;
  mentionToId: string | null;
  mentionToName: string | null;
  createdAt: string;
};

export type BoardReply = {
  id: string;
  boardId: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
};

export type SiteSettings = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutTitle: string | null;
  aboutText: string | null;
  instagramAccount: string | null;
  stripePublishableKey: string | null;
  googleClientId: string | null;
};
