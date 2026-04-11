import {
  getSiteSettings,
  getUpcomingEvents,
  getRecentBlogs,
  getPublicMembers,
} from '@/lib/queries';
import { HeroSection } from '@/components/HeroSection';
import { EventsSection } from '@/components/EventsSection';
import { BlogsSection } from '@/components/BlogsSection';
import { MembersSection } from '@/components/MembersSection';

export const revalidate = 60;

export default async function HomePage() {
  const [settings, events, blogs, members] = await Promise.all([
    getSiteSettings(),
    getUpcomingEvents(6),
    getRecentBlogs(6),
    getPublicMembers(12),
  ]);

  return (
    <main>
      <HeroSection settings={settings} />
      <EventsSection events={events} />
      <BlogsSection blogs={blogs} />
      <MembersSection members={members} />
      <footer className="py-8 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
        © みんなのWA — Next.js + Supabase 移行版（Step 2: 閲覧側）
      </footer>
    </main>
  );
}
