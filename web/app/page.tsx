import {
  getSiteSettings,
  getUpcomingEvents,
  getRecentBlogs,
  getPublicMembers,
  getRecentBoards,
  getOperatingMembers,
} from '@/lib/queries';
import { SiteHeader } from '@/components/SiteHeader';
import { HeroSection } from '@/components/HeroSection';
import { AboutSection } from '@/components/AboutSection';
import { EventsSection } from '@/components/EventsSection';
import { BlogsSection } from '@/components/BlogsSection';
import { MembersSection } from '@/components/MembersSection';
import { BoardPreviewSection } from '@/components/BoardPreviewSection';
import { FaqSection } from '@/components/FaqSection';
import { ContactSection } from '@/components/ContactSection';
import { LineCtaSection } from '@/components/LineCtaSection';
import { OperatingMembersSection } from '@/components/OperatingMembersSection';
import { SiteFooter } from '@/components/SiteFooter';

export const revalidate = 60;

const CONTACT_MESSAGES: Record<string, string> = {
  sent: 'お問い合わせを受け付けました。通常1〜2営業日以内にご返信します。',
  missing: '必須項目が入力されていません。',
  error: '送信中にエラーが発生しました。時間をおいて再度お試しください。',
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: { contact?: string };
}) {
  const [settings, events, blogs, members, boards, operating] = await Promise.all([
    getSiteSettings(),
    getUpcomingEvents(6),
    getRecentBlogs(6),
    getPublicMembers(12),
    getRecentBoards(5),
    getOperatingMembers(),
  ]);

  const contactMessage =
    searchParams.contact && CONTACT_MESSAGES[searchParams.contact]
      ? CONTACT_MESSAGES[searchParams.contact]
      : undefined;

  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection settings={settings} />
        <AboutSection title={settings?.aboutTitle} text={settings?.aboutText} />
        <EventsSection events={events} />
        <BlogsSection blogs={blogs} />
        <MembersSection members={members} />
        <BoardPreviewSection boards={boards} />
        <FaqSection />
        <ContactSection message={contactMessage} />
        <LineCtaSection />
        <OperatingMembersSection members={operating} />
        <SiteFooter />
      </main>
    </>
  );
}
