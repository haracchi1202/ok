import Link from "next/link";
import { getTherapistCards, sortTherapists } from "@/lib/therapists";
import {
  getActiveBanners,
  getFaqs,
  getFeatures,
  getImportantNews,
  getLatestDiaries,
  getNews,
  getPricePageData,
  getPublishedReviews,
  getRanking,
} from "@/lib/content";
import { rankingToCards } from "@/lib/ranking-cards";
import { getSettings } from "@/lib/settings";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CTAButton } from "@/components/ui/CTAButton";
import { Icon } from "@/components/ui/Icon";
import { TherapistRow } from "@/components/therapist/TherapistGrid";
import { ReviewCard } from "@/components/content/ReviewCard";
import { DiaryCard } from "@/components/content/DiaryCard";
import { NewsList } from "@/components/content/NewsList";
import { FaqList } from "@/components/content/FaqList";
import { PriceTable } from "@/components/content/PriceTable";
import { ReserveBand } from "@/components/site/ReserveBand";
import { EmptyState } from "@/components/ui/States";
import { formatDateShort, todayBusinessDate } from "@/lib/time";
import { formatDateLong } from "@/lib/time";
import { RANKING_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const QUICK_TAGS = [
  ["healing", "癒し系"],
  ["talkative", "会話好き"],
  ["massage", "マッサージ"],
  ["beginner", "初心者向き"],
  ["date", "デート向き"],
  ["tall", "高身長"],
];

export default async function HomePage() {
  const [settings, cards, important, banners, subBanners, popular, repeat, newcomerRank, diaries, features, reviews, faqs, prices, news] =
    await Promise.all([
      getSettings(),
      getTherapistCards(),
      getImportantNews(),
      getActiveBanners("HOME_MAIN"),
      getActiveBanners("HOME_SUB"),
      getRanking("POPULAR"),
      getRanking("REPEAT"),
      getRanking("NEWCOMER"),
      getLatestDiaries(8),
      getFeatures(4),
      getPublishedReviews(6),
      getFaqs(),
      getPricePageData(),
      getNews(4),
    ]);

  const today = todayBusinessDate();
  const working = sortTherapists(cards.filter((c) => c.shift), "shift");
  const nowList = sortTherapists(cards.filter((c) => c.canBookNow), "recommend");
  const newcomers = sortTherapists(cards.filter((c) => c.isNewcomer), "newcomer");

  const rankingSections = [
    { key: "POPULAR", data: popular, en: "POPULAR RANKING" },
    { key: "REPEAT", data: repeat, en: "REPEAT RANKING" },
    { key: "NEWCOMER", data: newcomerRank, en: "ROOKIE RANKING" },
  ] as const;

  return (
    <>
      {/* メインビジュアル */}
      <section className="relative overflow-hidden bg-night text-ivory">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-gold/25 blur-[100px]" />
          <div className="absolute bottom-[-12rem] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-rose/25 blur-[100px]" />
        </div>
        <div className="container-page relative grid gap-8 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="font-display text-xs tracking-[0.5em] text-gold-soft">THERAPIST RESERVATION</p>
            <h1 className="mt-3 text-[28px] leading-snug sm:text-4xl">
              今夜、あなたに
              <br />
              寄り添う人がいる。
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/75">{settings.site_tagline} 出勤・空き時間・料金・口コミをひとつの場所で。自分に合うセラピストを、迷わず見つけられます。</p>
            <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-ivory/60">{formatDateShort(today)} 本日の出勤</p>
                <p className="font-display text-3xl text-gold-soft">
                  {working.length}
                  <span className="ml-1 font-sans text-sm text-ivory/70">名</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-ivory/60">今すぐ会える</p>
                <p className="font-display text-3xl text-[#8fd6c0]">
                  {nowList.length}
                  <span className="ml-1 font-sans text-sm text-ivory/70">名</span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTAButton href="/now" variant="gold" size="lg" icon="clock">今すぐ会える人</CTAButton>
              <CTAButton href="/therapists" size="lg" icon="search" className="bg-white/10 hover:bg-white/20">セラピストを探す</CTAButton>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="人気のタグから探す">
              {QUICK_TAGS.map(([slug, name]) => (
                <li key={slug}>
                  <Link href={`/therapists?tags=${slug}`} className="rounded-full border border-white/15 px-3 py-1 text-xs text-ivory/80 hover:border-gold-soft hover:text-gold-soft">
                    #{name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {nowList.length > 0 && (
            <div className="hidden grid-cols-3 gap-3 lg:grid">
              {nowList.slice(0, 3).map((t, i) => (
                <Link key={t.id} href={`/therapists/${t.slug}`} className={`group relative overflow-hidden rounded-2xl ${i === 1 ? "translate-y-8" : ""}`}>
                  {t.thumb && <img src={t.thumb} alt={t.imageAlt} width={420} height={560} className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3">
                    <p className="font-serif tracking-widest">{t.name}</p>
                    <p className="text-[11px] text-[#8fd6c0]">● {t.nextAvailableLabel}〜 予約可</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 重要なお知らせ */}
      {important.length > 0 && (
        <section className="container-page mt-5" aria-label="重要なお知らせ">
          <ul className="space-y-2">
            {important.map((n) => (
              <li key={n.slug}>
                <Link href={`/news/${n.slug}`} className="flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm hover:bg-danger/10">
                  <Icon name="info" className="h-5 w-5 shrink-0 text-danger" />
                  <span className="flex-1">{n.title}</span>
                  <span className="hidden text-xs text-muted sm:inline">{formatDateLong(n.publishedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* キャンペーン・イベントバナー */}
      {banners.length > 0 && (
        <section className="container-page mt-6" aria-label="キャンペーン・イベント">
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            {banners.map((b) => (
              <Link key={b.id} href={b.linkUrl || "#"} className="group relative block w-[82vw] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-auto">
                {b.imagePath && <img src={b.imagePath.replace(".webp", "_t.webp")} alt="" width={800} height={400} className="aspect-[2/1] w-full object-cover transition group-hover:scale-[1.02]" />}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 p-4 text-ivory">
                  <p className="font-serif text-base tracking-wider">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-ivory/80">{b.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 今すぐ予約 CTA */}
      <section className="container-page mt-8">
        <div className="card flex flex-col items-center gap-4 p-5 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-lg">今日、会いたい気分なら。</p>
            <p className="text-sm text-muted">空き状況を見て、そのまま予約できます。フォームは最短1分。</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <CTAButton href="/reserve" variant="gold" icon="calendar" className="flex-1 sm:flex-none">今すぐ予約</CTAButton>
            <CTAButton href="/price/simulator" variant="outline" icon="yen" className="flex-1 sm:flex-none">料金を計算</CTAButton>
          </div>
        </div>
      </section>

      {/* 今すぐ会えるセラピスト */}
      <section className="container-page mt-14">
        <SectionHeader en="AVAILABLE NOW" title="今すぐ会えるセラピスト" moreHref="/now" lead={`${nowList.length}名が現在受付中`} />
        {nowList.length ? (
          <TherapistRow items={nowList.slice(0, 10)} />
        ) : (
          <EmptyState title="現在すぐにご案内できるセラピストはいません" description="本日出勤のセラピストやスケジュールから、ご希望の時間をお探しください。" actionHref="/schedule" actionLabel="スケジュールを見る" />
        )}
      </section>

      {/* ランキング */}
      {rankingSections.map((r) => {
        const list = rankingToCards(r.data, cards).slice(0, 5);
        if (!list.length) return null;
        return (
          <section key={r.key} className="container-page mt-14">
            <SectionHeader en={r.en} title={RANKING_TYPES[r.key]} moreHref={`/ranking?type=${r.key}`} />
            <TherapistRow items={list} ranked />
          </section>
        );
      })}

      {/* 本日出勤 */}
      <section className="container-page mt-14">
        <SectionHeader en="TODAY" title={`本日出勤 ${formatDateShort(today)}`} moreHref="/today" lead={`${working.length}名出勤`} />
        <TherapistRow items={working.slice(0, 10)} />
      </section>

      {/* 新人 */}
      {newcomers.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader en="NEW FACE" title="新人セラピスト" moreHref="/newcomers" />
          <TherapistRow items={newcomers.slice(0, 5)} />
        </section>
      )}

      {/* 最新日記 */}
      <section className="container-page mt-14">
        <SectionHeader en="DIARY" title="最新の日記" moreHref="/diary" />
        {diaries.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {diaries.slice(0, 8).map((d) => (
              <DiaryCard key={d.id} d={d} />
            ))}
          </div>
        ) : (
          <EmptyState title="日記はまだありません" />
        )}
      </section>

      {/* 動画・特集 */}
      {features.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader en="FEATURES" title="動画・特集" moreHref="/features" />
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:px-0">
            {features.map((f) => (
              <Link key={f.id} href={`/features/${f.slug}`} className="card group block w-[70vw] shrink-0 snap-start overflow-hidden sm:w-auto">
                <div className="relative aspect-video bg-ink-soft">
                  {f.imagePath && <img src={f.imagePath.replace(".webp", "_t.webp")} alt="" width={600} height={338} loading="lazy" className="h-full w-full object-cover" />}
                  {f.kind === "VIDEO" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-ink">
                        <Icon name="play" filled className="h-5 w-5" />
                      </span>
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] tracking-widest text-gold-deep">{f.kind === "VIDEO" ? "MOVIE" : "FEATURE"}</p>
                  <h3 className="line-clamp-2 text-sm font-medium">{f.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 口コミ */}
      <section className="container-page mt-14">
        <SectionHeader en="REVIEWS" title="ご利用者の口コミ" moreHref="/reviews" />
        {reviews.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <EmptyState title="口コミはまだありません" />
        )}
      </section>

      {/* 初めての方へ */}
      <section className="container-page mt-14">
        <SectionHeader en="FOR BEGINNERS" title="初めての方へ" moreHref="/guide" moreLabel="詳しく見る" />
        <ol className="grid gap-3 sm:grid-cols-5">
          {[
            ["search", "探す", "タグ・口コミで自分に合う人を"],
            ["calendar", "空きを確認", "時間帯ごとの空きをチェック"],
            ["yen", "料金を確認", "シミュレーターで総額を把握"],
            ["pen", "予約する", "フォーム・LINE・電話で"],
            ["heart", "当日", "待ち合わせてゆったりと"],
          ].map(([icon, title, desc], i) => (
            <li key={title} className="card flex items-center gap-4 p-4 sm:flex-col sm:text-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ivory text-gold-deep ring-1 ring-gold-soft">
                <Icon name={icon as "search"} />
              </span>
              <div>
                <p className="text-[11px] text-gold-deep">STEP {i + 1}</p>
                <p className="font-serif">{title}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 料金 */}
      <section className="container-page mt-14">
        <SectionHeader en="PRICE" title="料金" moreHref="/price" moreLabel="料金の詳細" />
        <PriceTable courses={prices.courses.slice(0, 3)} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <CTAButton href="/price/simulator" variant="primary" icon="yen">料金シミュレーターで総額を確認</CTAButton>
          <CTAButton href="/price" variant="outline">すべての料金を見る</CTAButton>
        </div>
      </section>

      {/* サブバナー */}
      {subBanners.length > 0 && (
        <section className="container-page mt-10 grid gap-3 sm:grid-cols-2">
          {subBanners.map((b) => (
            <Link key={b.id} href={b.linkUrl || "#"} className="group relative block overflow-hidden rounded-2xl">
              {b.imagePath && <img src={b.imagePath.replace(".webp", "_t.webp")} alt="" width={800} height={400} loading="lazy" className="aspect-[3/1] w-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-between bg-gradient-to-r from-black/60 to-transparent px-5 text-ivory">
                <div>
                  <p className="font-serif">{b.title}</p>
                  <p className="text-xs text-ivory/80">{b.subtitle}</p>
                </div>
                <Icon name="chevronRight" />
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* FAQ + ニュース */}
      <section className="container-page mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeader en="FAQ" title="よくある質問" moreHref="/faq" />
          <FaqList items={faqs.slice(0, 5)} />
        </div>
        <div>
          <SectionHeader en="NEWS" title="ニュース・トピックス" moreHref="/news" />
          <NewsList items={news} />
        </div>
      </section>

      <ReserveBand />
    </>
  );
}
