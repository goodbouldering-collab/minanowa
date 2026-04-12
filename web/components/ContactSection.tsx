import { submitContact } from '@/app/(actions)/contact';

const INSTAGRAM_DM_URL = 'https://ig.me/m/minnano_wa.shiga';

export function ContactSection({ message }: { message?: string }) {
  return (
    <section id="contact" className="py-16 px-6 bg-white">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">お問い合わせ</h2>
          <p className="text-slate-600 text-sm">ご質問・ご相談はお気軽にどうぞ</p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <form
          action={submitContact}
          className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">お名前 *</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス *</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">お問い合わせ内容 *</label>
            <textarea
              name="message"
              required
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand-600 text-white font-medium py-2.5 text-sm hover:bg-brand-700 transition-colors"
            >
              送信する
            </button>
            <a
              href={INSTAGRAM_DM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white font-medium py-2.5 text-sm text-center hover:opacity-90 transition-opacity"
            >
              DMで問い合わせ
            </a>
          </div>
          <p className="text-xs text-slate-500 text-center pt-2">
            通常1〜2営業日以内にご返信いたします
          </p>
        </form>
      </div>
    </section>
  );
}
