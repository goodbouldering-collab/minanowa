import type {
  MemberRow,
  EventRow,
  EventRegistrationRow,
  BlogRow,
  BoardRow,
  BoardReplyRow,
  SiteSettingsRow,
} from '@/types/database';
import type {
  Member,
  Event,
  EventRegistration,
  Blog,
  Board,
  BoardReply,
  SiteSettings,
} from '@/types/domain';

// Supabase は snake_case、TypeScript は camelCase。
// CLAUDE.md 規約により全テーブルでこの mapper 層を経由する。

export const toMember = (r: MemberRow): Member => ({
  id: r.id,
  email: r.email,
  name: r.name,
  furigana: r.furigana,
  phone: r.phone,
  business: r.business,
  businessCategory: r.business_category,
  introduction: r.introduction,
  avatarUrl: r.avatar_url,
  location: r.location,
  website: r.website,
  instagram: r.instagram,
  sns: r.sns,
  skills: r.skills,
  joinDate: r.join_date,
  isPublic: r.is_public,
  isAdmin: r.is_admin,
  profession: r.profession,
  homepage: r.homepage,
  googleMapUrl: r.google_map_url,
  role: r.role,
  mapLat: r.map_lat,
  mapLng: r.map_lng,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toEvent = (r: EventRow): Event => ({
  id: r.id,
  title: r.title,
  date: r.date,
  time: r.time,
  location: r.location,
  description: r.description,
  detailedInfo: r.detailed_info,
  participants: r.participants,
  fee: r.fee,
  imageUrl: r.image_url,
  isPast: r.is_past,
  applicationUrl: r.application_url,
  regDetails: r.reg_details,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toEventRegistration = (
  r: EventRegistrationRow
): EventRegistration => ({
  id: r.id,
  eventId: r.event_id,
  memberId: r.member_id,
  guestName: r.guest_name,
  guestEmail: r.guest_email,
  status: r.status,
  createdAt: r.created_at,
});

export const toBlog = (r: BlogRow): Blog => ({
  id: r.id,
  title: r.title,
  date: r.date,
  category: r.category,
  excerpt: r.excerpt,
  content: r.content,
  author: r.author,
  imageUrl: r.image_url,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toBoard = (r: BoardRow): Board => ({
  id: r.id,
  authorId: r.author_id,
  authorName: r.author_name,
  authorAvatar: r.author_avatar,
  title: r.title,
  content: r.content,
  category: r.category,
  mentionToId: r.mention_to_id,
  mentionToName: r.mention_to_name,
  createdAt: r.created_at,
});

export const toBoardReply = (r: BoardReplyRow): BoardReply => ({
  id: r.id,
  boardId: r.board_id,
  authorId: r.author_id,
  authorName: r.author_name,
  authorAvatar: r.author_avatar,
  content: r.content,
  createdAt: r.created_at,
});

export const toSiteSettings = (r: SiteSettingsRow): SiteSettings => ({
  heroTitle: r.hero_title,
  heroSubtitle: r.hero_subtitle,
  aboutTitle: r.about_title,
  aboutText: r.about_text,
  instagramAccount: r.instagram_account,
  stripePublishableKey: r.stripe_publishable_key,
  googleClientId: r.google_client_id,
});
