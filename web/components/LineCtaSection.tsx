import { LINE_INVITE_URL } from '@/lib/constants';

export function LineCtaSection() {
  return (
    <section id="lineCta" className="py-12 px-6 bg-gradient-to-br from-emerald-600 to-brand-700 text-white">
      <a
        href={LINE_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 hover:bg-white/15 transition-colors"
      >
        <span className="text-4xl flex-shrink-0">💬</span>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold mb-1">
            LINEオープンチャットで今すぐつながろう！
          </h3>
          <p className="text-sm text-white/85 leading-relaxed">
            メンバー限定の割引特典・コラボ相談・イベント告知がリアルタイムで。
            参加するだけで彦根の事業者ネットワークとお得な特典が手に入ります。
          </p>
        </div>
        <span className="text-sm font-bold px-4 py-2 bg-white text-brand-700 rounded-full whitespace-nowrap">
          参加する →
        </span>
      </a>
    </section>
  );
}
