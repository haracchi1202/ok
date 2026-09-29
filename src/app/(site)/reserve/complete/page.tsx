import type { Metadata } from "next";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { displayTimeOption, formatDateShort, formatDateTime } from "@/lib/time";
import { yen, parseJsonArray } from "@/lib/format";
import { RESERVATION_STATUS, label } from "@/lib/constants";
import { CTAButton } from "@/components/ui/CTAButton";
import { EmptyState } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "予約受付完了", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async function CompletePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { no = "", t = "" } = await searchParams;
  const settings = await getSettings();
  const r = /^R\d{6}-[A-Z0-9]{4,8}$/.test(no)
    ? await prisma.reservation.findUnique({ where: { reservationNo: no }, include: { therapist: true, secondTherapist: true, course: true, area: true } })
    : null;
  // 受付番号だけでは個人情報を表示しない (発行時のトークンが必要)
  if (!r || !t || !safeEqual(r.accessToken, t)) {
    return (
      <div className="container-page py-16">
        <EmptyState title="予約情報を表示できません" description="URL が正しくないか、有効期限が切れています。ご不明な点はお問い合わせください。" actionHref="/contact" actionLabel="お問い合わせ" />
      </div>
    );
  }
  const options = parseJsonArray(r.optionIds);
  const optionNames = options.length ? (await prisma.option.findMany({ where: { id: { in: options } } })).map((o) => o.name) : [];
  const breakdown = JSON.parse(r.priceBreakdown || "{}") as { lines?: { label: string; detail?: string; amount: number }[] };
  return (
    <div className="container-page max-w-3xl py-10">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl">ご予約リクエストを受け付けました</h1>
        <p className="mt-2 text-sm text-muted">担当スタッフが内容を確認し、ご連絡を差し上げた時点で予約確定となります。</p>
        <div className="mx-auto mt-6 inline-block rounded-2xl bg-night px-8 py-4 text-ivory">
          <p className="text-xs text-ivory/60">受付番号</p>
          <p className="font-display text-3xl tracking-widest text-gold-soft">{r.reservationNo}</p>
        </div>
        <p className="mt-3 text-xs text-muted">お問い合わせの際は受付番号をお伝えください。確認メールを {r.email} に送信しました。</p>
      </div>

      <div className="card mt-10 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">予約内容</h2>
          <Badge tone="warn">{label(RESERVATION_STATUS, r.status)}</Badge>
        </div>
        <dl className="mt-4 divide-y divide-line text-sm">
          {[
            ["希望日時", `${formatDateShort(r.desiredDate)} ${displayTimeOption(r.desiredTime)}〜`],
            ["セラピスト", `${r.therapist?.name ?? "指名なし（おまかせ）"}${r.secondTherapist ? ` ／ 第二希望：${r.secondTherapist.name}` : ""}`],
            ["コース", `${r.course?.name ?? "-"}${r.extensionCount ? `（延長${r.extensionCount}回）` : ""}`],
            ["オプション", optionNames.join("、") || "なし"],
            ["エリア", `${r.area?.name ?? "-"}${r.nearestStation ? `（${r.nearestStation}）` : ""}`],
            ["合流方法 / 場所", `${r.meetingMethod} ／ ${r.place}`],
            ["お名前", r.customerName],
            ["お支払い方法", r.paymentMethod],
            ["受付日時", formatDateTime(r.createdAt)],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {breakdown.lines && (
          <div className="mt-6 rounded-xl bg-ivory p-4">
            <p className="text-xs text-muted">お見積り明細</p>
            <ul className="mt-2 space-y-1 text-sm">
              {breakdown.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {l.label} <span className="text-xs text-muted">{l.detail}</span>
                  </span>
                  <span className="tabular-nums">{l.amount < 0 ? `−${yen(-l.amount)}` : yen(l.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-line pt-3">
              <span>合計（目安）</span>
              <span className="font-display text-2xl">{yen(r.estimatedTotal)}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <CTAButton href={settings.line_url} variant="line" icon="chat">{settings.line_label}</CTAButton>
        <CTAButton href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} variant="outline" icon="phone">電話で問い合わせ</CTAButton>
        <CTAButton href="/" variant="ghost" className="border border-line">トップへ戻る</CTAButton>
      </div>
    </div>
  );
}
