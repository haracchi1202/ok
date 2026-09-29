import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScheduleRange } from "@/lib/therapists";
import { isValidDateString } from "@/lib/time";
import { rateLimit } from "@/lib/rate-limit";

// 予約フォーム用: 指定セラピスト・日付の時間帯別空き状況 (公開情報のみ返す)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("therapist") ?? "";
  const date = url.searchParams.get("date") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0];
  if (!rateLimit(`avail:${ip}`, 120, 60000).ok) return NextResponse.json({ error: "too many requests" }, { status: 429 });
  if (!/^[a-z0-9-]{1,60}$/.test(slug) || !isValidDateString(date)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const t = await prisma.therapist.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [day] = await getScheduleRange(t.id, date, [date]);
  return NextResponse.json(
    { date, schedule: day.schedule && day.schedule.status === "WORKING" ? { label: day.schedule.label, note: day.schedule.note, slots: day.schedule.slots } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
