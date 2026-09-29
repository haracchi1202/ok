import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, STAFF_ROLES } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { RESERVATION_STATUS, label } from "@/lib/constants";
import { formatDateTime, toJstDateString } from "@/lib/time";
import { reservationFilter, reservationWhere } from "@/lib/admin/reservations";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  let s = String(v ?? "");
  // CSV インジェクション対策
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const q = Object.fromEntries(req.nextUrl.searchParams.entries());
  const rows = await prisma.reservation.findMany({
    where: reservationWhere(reservationFilter(q)),
    orderBy: { startAt: "desc" },
    take: 10000,
    include: { therapist: { select: { name: true } }, secondTherapist: { select: { name: true } }, course: { select: { name: true } }, area: { select: { name: true } } },
  });
  const header = ["予約番号", "ステータス", "希望日", "希望時刻", "第一希望", "第二希望", "リピート", "お名前", "電話番号", "メール", "エリア", "最寄り駅", "コース", "延長回数", "支払方法", "見積合計", "備考", "管理メモ", "受付日時"];
  const lines = rows.map((r) =>
    [
      r.reservationNo,
      label(RESERVATION_STATUS, r.status),
      r.desiredDate,
      r.desiredTime,
      r.therapist?.name ?? "フリー",
      r.secondTherapist?.name ?? "",
      r.isRepeat ? "リピート" : "初回",
      r.customerName,
      r.phone,
      r.email,
      r.area?.name ?? "",
      r.nearestStation,
      r.course?.name ?? "",
      r.extensionCount,
      r.paymentMethod,
      r.estimatedTotal,
      r.note,
      r.adminMemo,
      formatDateTime(r.createdAt),
    ]
      .map(csvCell)
      .join(","),
  );
  await audit(user.id, "export", "Reservation", "", { count: rows.length, filter: q });
  const body = "﻿" + [header.join(","), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations-${toJstDateString(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
