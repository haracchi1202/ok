import type { PriceMaster } from "./pricing";
import { isLateNightTime } from "./pricing";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** URL クエリ → シミュレーター/予約フォームの初期値 (マスターに存在する値のみ採用) */
export function parseSimParams(raw: Raw, master: PriceMaster) {
  const therapist = master.therapists.find((t) => t.slug === one(raw.therapist))?.slug ?? "";
  const course = master.courses.find((c) => c.id === one(raw.course))?.id ?? "";
  const area = master.areas.find((a) => a.id === one(raw.area))?.id ?? "";
  const campaign = master.campaigns.find((c) => c.id === one(raw.campaign))?.id ?? "";
  const options = one(raw.options)
    .split(",")
    .filter((id) => master.options.some((o) => o.id === id));
  const time = /^\d{2}:\d{2}$/.test(one(raw.time)) ? one(raw.time) : "";
  const ext = Math.max(0, Math.min(12, Number(one(raw.ext)) || 0));
  return {
    therapist,
    repeat: one(raw.repeat) === "1",
    course,
    ext,
    area,
    time,
    lateNight: one(raw.late) === "1" || isLateNightTime(time, master.rules),
    options,
    campaign,
  };
}
