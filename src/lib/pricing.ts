// 料金計算ロジック (クライアントのシミュレーター / サーバーの予約保存 で共通利用)
// 料金はすべて DB の料金マスターから渡され、この関数内に金額をハードコードしない。

export type PriceCourse = { id: string; name: string; minutes: number; price: number; isOvernight: boolean };
export type PriceOption = { id: string; name: string; price: number };
export type PriceArea = { id: string; name: string; transportFee: number };
export type PriceCampaign = {
  id: string;
  name: string;
  discountType: string; // AMOUNT | PERCENT
  value: number;
  target: string; // ALL | FIRST | REPEAT
  minCourseMinutes: number;
};
export type PriceTherapist = { id: string; name: string; nominationFee: number | null; slug?: string };

export type PriceMaster = {
  courses: PriceCourse[];
  options: PriceOption[];
  areas: PriceArea[];
  campaigns: PriceCampaign[];
  therapists: PriceTherapist[];
  rules: Record<string, number>;
  ruleLabels?: Record<string, string>;
};

export type PriceInput = {
  therapistId?: string | null; // null / 空 = フリー (指名なし)
  isRepeat: boolean;
  courseId?: string | null;
  extensionCount?: number; // 延長回数 (1 回 = extension_unit_minutes 分)
  areaId?: string | null;
  lateNight?: boolean;
  optionIds?: string[];
  campaignId?: string | null;
};

export type PriceLine = { key: string; label: string; amount: number; detail?: string };

export type PriceResult = {
  lines: PriceLine[];
  subtotal: number;
  discount: number;
  total: number;
  totalMinutes: number;
  campaign: PriceCampaign | null;
  warnings: string[];
  isComplete: boolean;
};

export const RULE_KEYS = {
  nominationFirst: "nomination_first",
  nominationRepeat: "nomination_repeat",
  extensionFee: "extension_fee",
  extensionUnit: "extension_unit_minutes",
  lateNightFee: "late_night_fee",
  lateNightStart: "late_night_start_hour",
  lateNightEnd: "late_night_end_hour",
} as const;

/** "25:30" のような営業日表記の時刻が深夜料金帯か */
export function isLateNightTime(time: string | undefined | null, rules: Record<string, number>): boolean {
  if (!time) return false;
  const [h] = time.split(":").map(Number);
  const start = rules[RULE_KEYS.lateNightStart] ?? 24;
  const end = rules[RULE_KEYS.lateNightEnd] ?? 29;
  // 0〜5時台の表記を 24〜29 時台に揃える
  const hour = h < 6 ? h + 24 : h;
  return hour >= start && hour < end;
}

export function campaignApplicable(
  c: PriceCampaign,
  input: Pick<PriceInput, "isRepeat">,
  course: PriceCourse | undefined,
): string | null {
  if (c.target === "FIRST" && input.isRepeat) return "初回ご利用の方限定のキャンペーンです";
  if (c.target === "REPEAT" && !input.isRepeat) return "リピートの方限定のキャンペーンです";
  if (c.minCourseMinutes > 0 && (!course || course.minutes < c.minCourseMinutes))
    return `${c.minCourseMinutes}分以上のコースが対象です`;
  return null;
}

export function calculatePrice(input: PriceInput, master: PriceMaster): PriceResult {
  const lines: PriceLine[] = [];
  const warnings: string[] = [];
  const r = master.rules;
  const label = (k: string, fallback: string) => master.ruleLabels?.[k] ?? fallback;

  const course = master.courses.find((c) => c.id === input.courseId);
  if (course) {
    lines.push({ key: "course", label: "基本料金", amount: course.price, detail: `${course.name}（${course.minutes}分）` });
  } else {
    warnings.push("コースを選択してください");
  }

  const extCount = Math.max(0, Math.min(20, Math.floor(input.extensionCount ?? 0)));
  const extUnit = r[RULE_KEYS.extensionUnit] ?? 30;
  if (extCount > 0 && course && !course.isOvernight) {
    const fee = (r[RULE_KEYS.extensionFee] ?? 0) * extCount;
    lines.push({ key: "extension", label: label(RULE_KEYS.extensionFee, "延長料金"), amount: fee, detail: `${extUnit * extCount}分` });
  }

  const therapist = master.therapists.find((t) => t.id === input.therapistId);
  if (therapist) {
    const fee =
      therapist.nominationFee ??
      (input.isRepeat ? r[RULE_KEYS.nominationRepeat] ?? 0 : r[RULE_KEYS.nominationFirst] ?? 0);
    lines.push({
      key: "nomination",
      label: "指名料",
      amount: fee,
      detail: `${therapist.name}（${input.isRepeat ? "本指名" : "初回指名"}）`,
    });
  } else {
    lines.push({ key: "nomination", label: "指名料", amount: 0, detail: "フリー（指名なし）" });
  }

  const area = master.areas.find((a) => a.id === input.areaId);
  if (area) {
    lines.push({ key: "transport", label: "交通費", amount: area.transportFee, detail: area.name });
  } else {
    warnings.push("ご利用エリアを選択すると交通費が反映されます");
  }

  if (input.lateNight && !course?.isOvernight) {
    lines.push({ key: "lateNight", label: label(RULE_KEYS.lateNightFee, "深夜料金"), amount: r[RULE_KEYS.lateNightFee] ?? 0 });
  }

  for (const id of input.optionIds ?? []) {
    const o = master.options.find((x) => x.id === id);
    if (o) lines.push({ key: `option:${o.id}`, label: "オプション", amount: o.price, detail: o.name });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  let discount = 0;
  let campaign: PriceCampaign | null = null;
  const c = master.campaigns.find((x) => x.id === input.campaignId);
  if (c) {
    const reason = campaignApplicable(c, input, course);
    if (reason) {
      warnings.push(`「${c.name}」は適用できません：${reason}`);
    } else {
      campaign = c;
      const base = (course?.price ?? 0) + (lines.find((l) => l.key === "extension")?.amount ?? 0);
      discount = c.discountType === "PERCENT" ? Math.floor((base * c.value) / 100 / 10) * 10 : c.value;
      discount = Math.min(discount, subtotal);
      lines.push({ key: "discount", label: "割引", amount: -discount, detail: c.name });
    }
  }

  return {
    lines,
    subtotal,
    discount,
    total: subtotal - discount,
    totalMinutes: (course?.minutes ?? 0) + (course?.isOvernight ? 0 : extCount * extUnit),
    campaign,
    warnings,
    isComplete: !!course && !!area,
  };
}
