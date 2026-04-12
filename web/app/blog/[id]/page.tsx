import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBlog, getRecentBlogs } from '@/lib/queries';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const blog = await getBlog(params.id);
  if (!blog) return { title: '記事が見つかりません' };
  return {
    title: blog.title,
    description: blog.excerpt ?? undefined,
    openGraph: {
      title: blog.title,
      description: blog.excerpt ?? undefined,
      images: blog.imageUrl ? [blog.imageUrl] : undefined,
      type: 'article',
      publishedTime: blog.date,
    },
  };
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const blog = await getBlog(params.id);
  if (!blog) notFound();

  const related = (await getRecentBlogs(4)).filter((b) => b.id !== blog.id).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.excerpt,
    image: blog.imageUrl ? [blog.imageUrl] : undefined,
    datePublished: blog.date,
    dateModified: blog.updatedAt,
    author: {
      '@type': 'Organization',
      name: blog.author ?? SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${blog.id}`,
    },
  };

  const speakable = {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.blog-excerpt'],
  };

  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6 text-sm">
            <Link href="/#blogs" className="text-slate-500 hover:text-brand-700">
              ← 記事一覧に戻る
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-4 text-xs">
            {blog.category && (
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-semibold">
                {blog.category}
              </span>
            )}
            <time className="text-slate-500">{formatDate(blog.date)}</time>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">
            {blog.title}
          </h1>
          {blog.excerpt && (
            <p className="blog-excerpt text-base text-slate-600 leading-relaxed mb-6">
              {blog.excerpt}
            </p>
          )}
          {blog.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={blog.imageUrl}
              alt={blog.title}
              className="w-full aspect-video object-cover rounded-2xl mb-8"
            />
          )}
          {blog.content && (
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-800 leading-relaxed">
              {blog.content}
            </div>
          )}
          {blog.author && (
            <div className="mt-10 pt-6 border-t border-slate-200 text-sm text-slate-500">
              著者: {blog.author}
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="bg-slate-50 py-12 px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-lg font-bold text-slate-900 mb-6">関連記事</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((b) => (
                  <Link
                    key={b.id}
                    href={`/blog/${b.id}`}
                    className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-card transition-shadow"
                  >
                    {b.imageUrl && (
                      <div className="aspect-video bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs text-slate-500 mb-1">{formatDate(b.date)}</p>
                      <h3 className="font-semibold text-sm text-slate-900 line-clamp-2">
                        {b.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        <SiteFooter />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakable) }}
      />
    </>
  );
}
