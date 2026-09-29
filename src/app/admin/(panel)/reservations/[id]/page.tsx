import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { RESERVATION_STATUS } from "@/lib/constants";
import { parseJsonArray, yen } from "@/lib/format";
import { formatDateShort, formatDateTime, formatShift, toBusinessDate } from "@/lib/time";
import { parseBreakdown, reservationRange } from "@/lib/admin/reservations";
import { changeReservationStatus, saveReservationMemo } from "@/lib/admin/reservation-actions";
import { MemoForm, StatusForm } from "@/components/admin/ReservationForms";
import { PageHeader, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "予約詳細" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-t border-line py-2 text-sm first:border-t-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(STAFF_ROLES);
  const { id } = await params;
  const r = await prisma.reservation.findUnique({
    where: { id },
    include: {
      therapist: { select: { id: true, name: true } },
      secondTherapist: { select: { id: true, name: true } },
      area: { select: { name: true } },
      course: { select: { name: true, minutes: true, price: true } },
    },
  });
  if (!r) notFound();
  const optionIds = parseJsonArray(r.optionIds);
  const [options, campaign, slots, logs] = await Promise.all([
    optionIds.length ? prisma.option.findMany({ where: { id: { in: optionIds } }, select: { id: true, name: true, price: true } }) : [],
    r.campaignId ? prisma.campaign.findUnique({ where: { id: r.campaignId }, select: { name: true } }) : null,
    prisma.availability.findMany({ where: { reservationId: r.id }, orderBy: { startAt: "asc" } }),
    prisma.auditLog.findMany({ where: { entity: "Reservation", entityId: r.id }, orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } }),
  ]);
  const range = await reservationRange(r);
  const bd = parseBreakdown(r.priceBreakdown);
  const businessDate = toBusinessDate(r.startAt);

  return (
    <>
      <PageHeader
        title={`予約 ${r.reservationNo}`}
        description={
          <>
            <StatusPill status={r.status} labels={RESERVATION_STATUS} /> 受付: {formatDateTime(r.createdAt)}
          </>
        }
        back={{ href: "/admin/reservations", label: "予約一覧" }}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="ご予約内容">
            <dl>
              <Row label="希望日時">
                {formatDateShort(r.desiredDate)} {r.desiredTime}〜 ({formatShift(range.start, range.end, businessDate)} / {range.minutes}分)
              </Row>
              <Row label="第一希望">
                {r.therapist ? <Link href={`/admin/therapists/${r.therapist.id}`} className="underline">{r.therapist.name}</Link> : "フリー (指名なし)"}
              </Row>
              <Row label="第二希望">{r.secondTherapist?.name}</Row>
              <Row label="ご利用">{r.isRepeat ? "リピート" : "初回"}</Row>
              <Row label="コース">{r.course ? `${r.course.name} (${r.course.minutes}分 / ${yen(r.course.price)})` : "—"}</Row>
              <Row label="延長">{r.extensionCount ? `${r.extensionCount} 回` : "なし"}</Row>
              <Row label="オプション">{options.map((o) => `${o.name} (${yen(o.price)})`).join("、") || (optionIds.length ? `不明なオプション ${optionIds.length} 件` : "なし")}</Row>
              <Row label="キャンペーン">{campaign?.name ?? (r.campaignId ? "削除済みのキャンペーン" : "なし")}</Row>
              <Row label="エリア">{r.area?.name}</Row>
              <Row label="最寄り駅">{r.nearestStation}</Row>
              <Row label="待ち合わせ">{r.meetingMethod}</Row>
              <Row label="利用場所">{r.place}</Row>
              <Row label="お支払い">{r.paymentMethod}</Row>
              <Row label="備考">
                <span className="whitespace-pre-wrap">{r.note}</span>
              </Row>
            </dl>
          </Card>
          <Card title="お客様情報">
            <dl>
              <Row label="お名前">{r.customerName}</Row>
              <Row label="電話番号">
                <a href={`tel:${r.phone}`} className="underline">{r.phone}</a>
              </Row>
              <Row label="メール">
                <a href={`mailto:${r.email}`} className="underline">{r.email}</a>
              </Row>
            </dl>
          </Card>
          <Card title="料金の内訳 (見積)">
            {bd && bd.lines.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {bd.lines.map((l, i) => (
                    <tr key={i} className="border-t border-line first:border-t-0">
                      <td className="py-1.5">
                        {l.label}
                        {l.detail && <span className="ml-2 text-xs text-muted">{l.detail}</span>}
                      </td>
                      <td className={`py-1.5 text-right ${l.amount < 0 ? "text-danger" : ""}`}>{yen(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted">内訳データがありません。</p>
            )}
            <p className="mt-2 flex justify-between border-t border-ink pt-2 font-semibold">
              <span>合計</span>
              <span>{yen(bd?.total ?? r.estimatedTotal)}</span>
            </p>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="ステータス変更">
            <StatusForm action={changeReservationStatus.bind(null, r.id)} status={r.status} />
          </Card>
          <Card title="押さえている予約枠">
            {slots.length ? (
              <ul className="text-sm">
                {slots.map((s) => (
                  <li key={s.id}>{formatShift(s.startAt, s.endAt, businessDate)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">なし</p>
            )}
          </Card>
          <Card title="管理メモ">
            <MemoForm action={saveReservationMemo.bind(null, r.id)} memo={r.adminMemo} />
          </Card>
          <Card title="操作履歴">
            {logs.length ? (
              <ul className="space-y-1 text-xs">
                {logs.map((l) => (
                  <li key={l.id}>
                    <span className="text-muted">{formatDateTime(l.createdAt)}</span> {l.actor?.name ?? "—"} {l.action} {l.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">なし</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
