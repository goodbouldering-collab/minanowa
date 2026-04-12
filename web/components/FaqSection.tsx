const FAQS = [
  {
    q: '具体的にどんなメリットがありますか？',
    a: '大きく3つあります。①メンバー同士がお互いのサービスを利用するので「お客さん」が増える ②異業種コラボで新商品・新企画が生まれる ③運営に関わるとWebサイト制作やSNSマーケティングなどのITスキルが実践で身につく。',
  },
  {
    q: '参加費用はかかりますか？',
    a: '会員登録は無料です。交流会参加時には1,000円〜3,000円程度の参加費をいただいています。',
  },
  {
    q: '紹介割引とは何ですか？',
    a: 'メンバーが新しい方を交流会にお連れいただくと、紹介者の参加費が500円割引になる制度です。紹介された方の参加費は通常どおりです。',
  },
  {
    q: '紹介割引を受けるには当日一緒に参加する必要がありますか？',
    a: 'はい、原則として紹介者ご本人も当日の交流会にご参加いただくことが条件です。やむを得ず当日参加できない場合は、事前に運営までご連絡ください。',
  },
  {
    q: 'どんな業種の方が参加していますか？',
    a: 'IT・Web、飲食、教育、建設、サービス、農業、製造、小売など彦根を中心に様々な業種の事業者が参加しています。業種が違うからこそ「お互いのお客さんになれる」のが最大の強みです。',
  },
  {
    q: '個人事業主でも参加できますか？',
    a: 'はい、法人・個人事業主を問わずどなたでもご参加いただけます。',
  },
  {
    q: '交流会はどんな雰囲気ですか？',
    a: '堅苦しい名刺交換会ではなく、お茶やお菓子を囲みながらリラックスした雰囲気で進みます。初参加の方にはスタッフが付き添うので、人見知りの方でも安心です。',
  },
  {
    q: '運営メンバーの参加費はどうなっていますか？',
    a: '運営メンバーも参加費をお支払いいただきます。全員が同じ条件で参加することで対等なコミュニティを維持しています。',
  },
  {
    q: '彦根市外からでも参加できますか？',
    a: 'もちろんです。長浜・米原・近江八幡など近隣市町や県外からの参加者も歓迎しています。',
  },
  {
    q: '友人・知人を紹介するにはどうすればいいですか？',
    a: 'イベント申し込み時に「紹介者あり」を選択し、紹介する方のお名前をご記入ください。',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 px-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">よくある質問</h2>
          <p className="text-slate-600 text-sm">参加前に知っておきたいこと</p>
        </div>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="bg-white rounded-xl border border-slate-200 group"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-semibold text-slate-900 text-sm">
                <span className="flex-1">{f.q}</span>
                <span className="text-brand-600 group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
}
