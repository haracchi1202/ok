import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTherapistBySlug, getTherapistCards, getScheduleRange } from "@/lib/therapists";
import { getLatestDiaries, getPublishedReviews, getReviewStats, getPriceMaster } from "@/lib/content";
import { getSettings, siteUrl } from "@/lib/settings";
import { addDays, formatDateShort, isWeekend, todayBusinessDate } from "@/lib/time";
import { truncate, yen } from "@/lib/format";
import { toEmbedUrl } from "@/lib/video";
import { RANKING_PERIODS, RANKING_TYPES, TAG_GROUPS, label } from "@/lib/constants";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Gallery } from "@/components/therapist/Gallery";
import { ScheduleTable } from "@/components/therapist/ScheduleTable";
import { AvailabilityBadge } from "@/components/therapist/AvailabilityBadge";
import { FavoriteButton } from "@/components/therapist/FavoriteButton";
import { CTAButton } from "@/components/ui/CTAButton";
import { Badge } from "@/components/ui/Badge";
import { TagChip } from "@/components/ui/TagChip";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReviewCard } from "@/components/content/ReviewCard";
import { DiaryCard } from "@/components/content/DiaryCard";
import { EmptyState } from "@/components/ui/States";
import { JsonLd } from "@/components/ui/JsonLd";
import { TherapistRow } from "@/components/therapist/TherapistGrid";
import { ReserveBand } from "@/components/site/ReserveBand";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTherapistBySlug((await params).slug);
  if (!t) return { title: "セラピストが見つかりません" };
  const description = truncate(`${t.catchCopy} ${t.shopComment}`, 110);
  return {
    title: `${t.name}（${t.age}歳・${t.height}cm）のプロフィール`,
    description,
    alternates: { canonical: `/therapists/${t.slug}` },
    openGraph: { title: `${t.name}｜プロフィール`, description, images: t.images[0] ? [t.images[0].path] : undefined, type: "profile" },
  };
}

export default async function TherapistPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTherapistBySlug(slug);
  if (!t) notFound();

  const today = todayBusinessDate();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [settings, cards, schedule, reviews, stats, diaries, price] = await Promise.all([
    getSettings(),
    getTherapistCards(),
    getScheduleRange(t.id, today, dates),
    getPublishedReviews(3, t.id),
    getReviewStats(t.id),
    getLatestDiaries(4, t.id),
    getPriceMaster(),
  ]);
  const card = cards.find((c) => c.id === t.id)!;
  const features = t.tags.filter((x) => x.tag.isActive && x.tag.group !== "SERVICE").map((x) => x.tag);
  const services = t.tags.filter((x) => x.tag.isActive && x.tag.group === "SERVICE").map((x) => x.tag);
  const answers = [...t.answers].filter((a) => a.answer.trim()).sort((a, b) => a.question.sortOrder - b.question.sortOrder);
  const embed = toEmbedUrl(t.videoUrl);
  const sns = [
    { href: t.snsX, label: "X" },
    { href: t.snsInstagram, label: "Instagram" },
    { href: t.snsTiktok, label: "TikTok" },
  ].filter((s) => s.href);
  const nominationFirst = t.nominationFee ?? price.rules.nomination_first ?? 0;
  const nominationRepeat = t.nominationFee ?? price.rules.nomination_repeat ?? 0;
  const rankHistory = t.rankingEntries.filter((e) => e.rank <= 10).slice(0, 6);
  const similar = cards
    .filter((c) => c.id !== t.id && c.tags.some((x) => features.some((f) => f.slug === x.slug)))
    .sort((a, b) => Number(b.canBookNow) - Number(a.canBookNow))
    .slice(0, 5);
  const reserveHref = `/reserve?therapist=${t.slug}`;

  const days = schedule.map((d) => ({ ...d, label: formatDateShort(d.date), weekend: isWeekend(d.date) }));

  return (
    <>
      <Breadcrumbs items={[{ name: "セラピスト一覧", href: "/therapists" }, { name: t.name }]} />
      <div className="container-page mt-3 grid gap-8 px-0 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        {/* ギャラリー */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Gallery images={t.images} name={t.name} />
        </div>

        {/* 基本情報 */}
        <div className="px-4 sm:px-0">
          <div className="flex flex-wrap gap-1.5">
            {t.isNewcomer && <Badge tone="new">NEW 新人</Badge>}
            {card.bestRank && (
              <Badge tone="rank">
                <Icon name="crown" className="h-3 w-3" />
                {card.bestRank.label}ランキング {card.bestRank.rank}位
              </Badge>
            )}
            {card.shift && <Badge tone="today">本日出勤 {card.shift.label}</Badge>}
            {t.canOvernight && <Badge tone="outline">宿泊対応</Badge>}
          </div>
          <h1 className="mt-3 text-3xl tracking-[0.2em]">{t.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.nameKana} ／ {t.age}歳 ／ {t.height}cm
            {t.currentArea && <> ／ 現在地 {t.currentArea.name}</>}
          </p>
          {t.catchCopy && <p className="mt-4 font-serif text-lg leading-relaxed text-ink-soft">{t.catchCopy}</p>}
          {stats.count > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
              <Stars rating={stats.average} />
              <span className="font-medium">{stats.average.toFixed(1)}</span>
              <span className="text-muted underline">口コミ {stats.count}件</span>
            </a>
          )}
          {features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="特徴タグ">
              {features.map((tag) => (
                <li key={tag.id}>
                  <TagChip name={tag.name} slug={tag.slug} linked />
                </li>
              ))}
            </ul>
          )}

          {/* 予約ステータス + CTA */}
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">現在の予約状況</p>
                <div className="mt-1">
                  <AvailabilityBadge t={card} className="text-xs" />
                </div>
              </div>
              {card.nextAvailableLabel && (
                <div className="text-right">
                  <p className="text-xs text-muted">最短受付</p>
                  <p className="font-display text-2xl text-ok">{card.nextAvailableLabel}〜</p>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <CTAButton href={card.nextAvailableTime24 ? `${reserveHref}&date=${today}&time=${card.nextAvailableTime24}` : reserveHref} variant="gold" size="lg" icon="calendar" className="col-span-2">
                {t.name}を予約する
              </CTAButton>
              <CTAButton href="#schedule" variant="outline" icon="clock">スケジュール</CTAButton>
              <FavoriteButton slug={t.slug} name={t.name} variant="button" />
              <CTAButton href={settings.line_url} variant="line" icon="chat">{settings.line_label}</CTAButton>
              <CTAButton href={`/contact?therapist=${t.slug}`} variant="ghost" icon="pen" className="border border-line">問い合わせ</CTAButton>
            </div>
          </div>

          {/* プロフィール Q&A */}
          {answers.length > 0 && (
            <section className="mt-10" aria-labelledby="profile-heading">
              <h2 id="profile-heading" className="mb-3 text-lg">プロフィール</h2>
              <dl className="divide-y divide-line rounded-2xl bg-paper shadow-[var(--shadow-card)]">
                {answers.map((a) => (
                  <div key={a.id} className="grid grid-cols-[7.5rem_1fr] gap-3 px-5 py-3 text-sm">
                    <dt className="text-muted">{a.question.question}</dt>
                    <dd>{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <div className="container-page mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-12">
          {/* 出勤スケジュール */}
          <section id="schedule" className="scroll-mt-24">
            <SectionHeader en="SCHEDULE" title="出勤スケジュール・空き状況" lead="日付をタップすると時間帯ごとの予約状況を確認できます" />
            <ScheduleTable days={days} slug={t.slug} inquiryHref={settings.line_url} />
          </section>

          {/* 店舗からの紹介 / 本人メッセージ */}
          {(t.shopComment || t.selfMessage) && (
            <section className="grid gap-4 md:grid-cols-2">
              {t.shopComment && (
                <div className="card p-6">
                  <p className="font-display text-[11px] tracking-[0.3em] text-gold">FROM SHOP</p>
                  <h2 className="mt-1 text-base">お店からの紹介</h2>
                  <p className="mt-3 text-sm leading-loose whitespace-pre-line text-ink-soft">{t.shopComment}</p>
                </div>
              )}
              {t.selfMessage && (
                <div className="card bg-night p-6 text-ivory">
                  <p className="font-display text-[11px] tracking-[0.3em] text-gold-soft">MESSAGE</p>
                  <h2 className="mt-1 text-base">{t.name}からのメッセージ</h2>
                  <p className="mt-3 text-sm leading-loose whitespace-pre-line text-ivory/85">{t.selfMessage}</p>
                </div>
              )}
            </section>
          )}

          {/* 動画 */}
          {t.videoUrl && (
            <section>
              <SectionHeader en="MOVIE" title="動画" />
              {embed ? (
                <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                  <iframe src={embed} title={`${t.name}の動画`} className="h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <CTAButton href={t.videoUrl} variant="outline" icon="play">動画を見る</CTAButton>
              )}
            </section>
          )}

          {/* 口コミ */}
          <section id="reviews" className="scroll-mt-24">
            <SectionHeader en="REVIEWS" title={`${t.name}の口コミ`} moreHref={stats.count > 3 ? `/reviews?therapist=${t.slug}` : undefined} moreLabel="口コミをもっと見る" />
            {reviews.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} r={r} showTherapist={false} />
                ))}
              </div>
            ) : (
              <EmptyState title="まだ口コミはありません" description="ご利用後の感想をお待ちしています。" />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.count > 3 && <CTAButton href={`/reviews?therapist=${t.slug}`} variant="outline" size="sm">口コミをもっと見る（{stats.count}件）</CTAButton>}
              <CTAButton href={`/reviews/new?therapist=${t.slug}`} variant="ghost" size="sm" icon="pen" className="border border-line">口コミを投稿する</CTAButton>
            </div>
          </section>

          {/* 日記 */}
          <section>
            <SectionHeader en="DIARY" title={`${t.name}の日記`} moreHref={diaries.length ? `/diary?therapist=${t.slug}` : undefined} />
            {diaries.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {diaries.map((d) => (
                  <DiaryCard key={d.id} d={d} showTherapist={false} />
                ))}
              </div>
            ) : (
              <EmptyState title="まだ日記はありません" />
            )}
          </section>
        </div>

        {/* サイド情報 */}
        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-base">料金の目安</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">初回指名料</dt><dd>{yen(nominationFirst)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">本指名料</dt><dd>{yen(nominationRepeat)}</dd></div>
              {price.courses[0] && (
                <div className="flex justify-between"><dt className="text-muted">コース</dt><dd>{yen(price.courses[0].price)}〜</dd></div>
              )}
            </dl>
            <CTAButton href={`/price/simulator?therapist=${t.slug}`} variant="primary" size="sm" icon="yen" full className="mt-4">
              {t.name}で料金を計算
            </CTAButton>
          </div>

          {services.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base">{TAG_GROUPS.SERVICE}</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {services.map((s) => (
                  <li key={s.id}><TagChip name={s.name} slug={s.slug} linked /></li>
                ))}
                {t.canOvernight && <li><span className="chip">#宿泊対応</span></li>}
              </ul>
            </div>
          )}

          {rankHistory.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base">ランキング実績</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {rankHistory.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="text-muted">
                      {label(RANKING_TYPES, e.ranking.type)}（{label(RANKING_PERIODS, e.ranking.period)} {e.ranking.periodStart.slice(0, 7).replace("-", "/")}）
                    </span>
                    <span className="flex items-center gap-1 font-medium text-gold-deep"><Icon name="crown" className="h-3.5 w-3.5" />{e.rank}位</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {t.events.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base">参加中のイベント</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {t.events.map(({ event }) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug}`} className="flex items-center justify-between gap-2 hover:text-gold-deep">
                      {event.title}
                      <Icon name="chevronRight" className="h-4 w-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sns.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base">SNS</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {sns.map((s) => (
                  <li key={s.label}>
                    <a href={s.href!} target="_blank" rel="noopener noreferrer nofollow" className="chip gap-1.5 hover:border-gold">
                      {s.label}
                      <Icon name="external" className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader en="SIMILAR" title="雰囲気の近いセラピスト" />
          <TherapistRow items={similar} />
        </section>
      )}

      <ReserveBand title={`${t.name}を予約する`} therapistSlug={t.slug} />

      {/* スマホ用 固定予約バー (下部ナビの上) */}
      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-sm">{t.name}</p>
            <p className="truncate text-[11px] text-muted">{card.nextAvailableLabel ? `最短 ${card.nextAvailableLabel}〜 受付可` : card.shift ? `本日 ${card.shift.label}` : "スケジュールをご確認ください"}</p>
          </div>
          <CTAButton href={card.nextAvailableTime24 ? `${reserveHref}&date=${today}&time=${card.nextAvailableTime24}` : reserveHref} variant="gold" icon="calendar">
            この人を予約
          </CTAButton>
        </div>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: t.name,
          url: `${siteUrl}/therapists/${t.slug}`,
          image: t.images[0] ? `${siteUrl}${t.images[0].path}` : undefined,
          description: t.catchCopy,
          worksFor: { "@type": "Organization", name: settings.site_name, url: siteUrl },
          ...(stats.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: stats.average.toFixed(1), reviewCount: stats.count } } : {}),
        }}
      />
    </>
  );
}
