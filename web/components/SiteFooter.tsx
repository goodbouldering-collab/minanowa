import Link from 'next/link';
import { SITE_NAME, LINE_INVITE_URL, INSTAGRAM_URL } from '@/lib/constants';

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <h4 className="font-bold text-white mb-3">{SITE_NAME}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            彦根の事業主が「お客さん・コラボ・スキル」を同時に手に入れる異業種コミュニティ。
          </p>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">リンク</h4>
          <ul className="space-y-1.5 text-xs">
            <li><Link href="/#about" className="hover:text-white">みんなのWAとは</Link></li>
            <li><Link href="/#events" className="hover:text-white">交流会・イベント</Link></li>
            <li><Link href="/#blogs" className="hover:text-white">活動レポート</Link></li>
            <li><Link href="/#members" className="hover:text-white">メンバー</Link></li>
            <li><Link href="/board" className="hover:text-white">掲示板</Link></li>
            <li><Link href="/feed" className="hover:text-white">RSS フィード</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">サポート</h4>
          <ul className="space-y-1.5 text-xs">
            <li><Link href="/#faq" className="hover:text-white">よくある質問</Link></li>
            <li><Link href="/#contact" className="hover:text-white">お問い合わせ</Link></li>
            <li><Link href="/register" className="hover:text-white">会員登録</Link></li>
            <li><Link href="/login" className="hover:text-white">ログイン</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">SNS</h4>
          <ul className="space-y-1.5 text-xs">
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Instagram
              </a>
            </li>
            <li>
              <a href={LINE_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                LINE オープンチャット
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
        © 2024-2026 {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
