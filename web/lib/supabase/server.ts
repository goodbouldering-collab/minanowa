import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// NOTE: カスタムスキーマ (`minanowa`) + supabase-js 2.103 の組み合わせでは
// Database ジェネリックの型推論が不安定なため、クライアント型は any で緩める。
// ランタイムの型安全は `lib/supabase-mappers.ts` で担保する。

export function createClient() {
  const cookieStore = cookies();

  const client: any = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'minanowa' as any },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component から呼ばれた場合は無視（middleware が更新する）
          }
        },
      },
    }
  );
  return client;
}

export function createAdminClient() {
  const client: any = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'minanowa' as any },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
  return client;
}
