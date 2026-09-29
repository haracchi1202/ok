// 日時ユーティリティ。サーバーのタイムゾーンに依存せず、常に JST(UTC+9) で扱う。
// 営業日は「BUSINESS_DAY_START_HOUR 時」で切り替わる (例: 6 時なら 翌2:00 は前日の営業日)。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const BUSINESS_DAY_START_HOUR = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Date → JST のカレンダー日付 YYYY-MM-DD */
export function toJstDateString(date: Date): string {
  const d = new Date(date.getTime() + JST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Date → JST の HH:MM */
export function toJstTime(date: Date): string {
  const d = new Date(date.getTime() + JST_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 営業日の HH:MM を実時刻へ。hour < 営業日開始時刻なら翌日扱い (24時以降表記にも対応: "26:00") */
export function businessDateTime(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  let hour = h;
  let addDays = 0;
  if (hour >= 24) {
    hour -= 24;
    addDays = 1;
  } else if (hour < BUSINESS_DAY_START_HOUR) {
    addDays = 1;
  }
  const base = new Date(`${date}T${pad(hour)}:${pad(m || 0)}:00+09:00`);
  return new Date(base.getTime() + addDays * 86400000);
}

/** 実時刻 → 営業日 YYYY-MM-DD */
export function toBusinessDate(date: Date): string {
  return toJstDateString(new Date(date.getTime() - BUSINESS_DAY_START_HOUR * 3600000));
}

export function todayBusinessDate(now = new Date()): string {
  return toBusinessDate(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+09:00`);
  return toJstDateString(new Date(d.getTime() + days * 86400000));
}

export function isValidDateString(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00+09:00`).getTime());
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function weekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T12:00:00+09:00`).getUTCDay()];
}

export function isWeekend(date: string): "sat" | "sun" | null {
  const w = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  return w === 6 ? "sat" : w === 0 ? "sun" : null;
}

/** "9/29(火)" */
export function formatDateShort(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${weekday(date)})`;
}

/** "2026年9月29日" */
export function formatDateLong(date: Date | string): string {
  const s = typeof date === "string" ? date : toJstDateString(date);
  const [y, m, d] = s.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export function formatDateTime(date: Date): string {
  return `${formatDateLong(date)} ${toJstTime(date)}`;
}

/** 営業日基準の時刻表示。翌日にまたがる時刻は "翌2:00" のように表す */
export function formatShiftTime(at: Date, businessDate: string): string {
  const t = toJstTime(at);
  return toJstDateString(at) > businessDate ? `翌${t.replace(/^0/, "")}` : t;
}

export function formatShift(startAt: Date, endAt: Date, businessDate: string): string {
  return `${formatShiftTime(startAt, businessDate)}〜${formatShiftTime(endAt, businessDate)}`;
}

/** 分単位で切り上げ */
export function ceilToMinutes(date: Date, minutes: number): Date {
  const ms = minutes * 60000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/** 営業時間内の開始時刻候補 (予約フォーム用) */
export function timeOptions(startHour = 10, endHour = 29, stepMinutes = 30): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

/** "26:00" → "翌2:00" の表示 */
export function displayTimeOption(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return h >= 24 ? `翌${h - 24}:${pad(m)}` : t;
}
