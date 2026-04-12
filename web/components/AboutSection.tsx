const CARDS = [
  {
    icon: '🛒',
    title: '参加した日から「お客さん」が増える',
    summary: 'メンバー同士がサービスを相互利用し、割引特典でお得に広がる',
    body:
      '美容師さんがカフェ経営者のランチを食べに行き、カフェ経営者が美容師さんにカットを頼む。メンバー同士がお互いのサービスを利用することで、登録した日から信頼できる顧客基盤ができます。メンバー限定の割引特典でお得にリピート利用できます。',
  },
  {
    icon: '⚡',
    title: '「一緒にやろう」が翌週には形になる',
    summary: '異業種だから生まれるコラボを即スタート',
    body:
      '交流会で「飲食×農業で地元マルシェやりたい」とつぶやけば、翌週には掲示板で企画がスタート。IT事業者がチラシを作り、建設業者が会場を手配 ── 異業種の仲間がいるから、思いつきが本当のビジネスになるスピードが段違いです。',
  },
  {
    icon: '💡',
    title: '「これ誰に聞けば？」が5分で解決',
    summary: '同じ悩みを乗り越えた仲間がすぐに答えてくれる',
    body:
      '確定申告の相談、ホームページの作り方、集客のコツ ── 一人で悩むと何日もかかることが、掲示板に投稿すれば同じ悩みを乗り越えた仲間がすぐに答えてくれます。彦根の事業主だけの頼れる相談窓口です。',
  },
  {
    icon: '🚀',
    title: '運営メンバーになると「スキル」が爆上がり',
    summary: 'サイト制作・SNS運用・イベント企画が実践で身につく',
    body:
      'このサイトの更新、SNS発信、イベント企画、動画制作 ── 運営スタッフとして手伝うと、Webサイト制作・SNSマーケティング・デザインのスキルが実践で身につきます。学んだことはそのまま自分の事業に活かせます。',
  },
];

const CHECKS = [
  { icon: '📅', label: '月1回の交流会', detail: '名刺交換・事業PR・悩み相談ができる定期イベント。初参加でも1分自己紹介タイムで全員と繋がれます。' },
  { icon: '🎁', label: '特典で相互利用がお得', detail: '施術10%OFF・初回体験無料・ドリンクサービスなど、メンバー限定特典を相互に利用できます。' },
  { icon: '🤝', label: 'コラボ企画で新しい売上', detail: '飲食×IT、教育×デザインなど異業種コラボで新商品・イベントを企画できます。' },
  { icon: '💬', label: '掲示板で相談・コラボ募集', detail: '24時間いつでもメンバー同士が相談・告知・コラボ募集できるオンライン掲示板です。' },
];

export function AboutSection({ title, text }: { title?: string | null; text?: string | null }) {
  return (
    <section id="about" className="py-16 px-6 bg-gradient-to-b from-white to-brand-50/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {title ?? 'みんなのWAとは'}
          </h2>
          <p className="text-slate-600 text-sm">
            {text ?? '彦根発・琵琶湖のほとりで事業者がつながり、成長し合うコミュニティ'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {CARDS.map((c) => (
            <div
              key={c.title}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-card p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{c.icon}</span>
                <h3 className="font-bold text-slate-900 text-base leading-tight">{c.title}</h3>
              </div>
              <p className="text-xs text-brand-700 mb-2 font-medium">{c.summary}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-bold text-slate-900 mb-4 text-center">具体的にできること</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHECKS.map((c) => (
              <div key={c.label} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{c.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
