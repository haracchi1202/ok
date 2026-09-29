// DB では String で保持している列挙値の定義と表示ラベル

export const THERAPIST_STATUS = { ACTIVE: "公開", HIDDEN: "非公開", RETIRED: "退店" } as const;
export type TherapistStatus = keyof typeof THERAPIST_STATUS;

export const TAG_GROUPS = { FEATURE: "特徴", STYLE: "雰囲気・タイプ", SERVICE: "対応サービス" } as const;
export type TagGroup = keyof typeof TAG_GROUPS;

export const SCHEDULE_STATUS = { WORKING: "出勤", OFF: "休み", TBD: "調整中" } as const;
export type ScheduleStatus = keyof typeof SCHEDULE_STATUS;

export const SLOT_STATUS = {
  AVAILABLE: "予約可能",
  BOOKED: "予約済",
  INQUIRY: "要問い合わせ",
  CLOSED: "受付終了",
} as const;
export type SlotStatus = keyof typeof SLOT_STATUS;

export const RESERVATION_STATUS = {
  PENDING: "仮受付",
  REVIEWING: "確認中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
} as const;
export type ReservationStatus = keyof typeof RESERVATION_STATUS;

export const REVIEW_STATUS = { PENDING: "承認待ち", PUBLISHED: "公開", HIDDEN: "非公開" } as const;
export type ReviewStatus = keyof typeof REVIEW_STATUS;

export const DIARY_STATUS = { DRAFT: "下書き", PUBLISHED: "公開" } as const;

export const RANKING_TYPES = {
  POPULAR: "人気ランキング",
  REPEAT: "リピートランキング",
  NEWCOMER: "新人ランキング",
  SUPPORT: "応援ランキング",
} as const;
export type RankingType = keyof typeof RANKING_TYPES;

export const RANKING_PERIODS = { DAILY: "デイリー", WEEKLY: "週間", MONTHLY: "月間" } as const;
export type RankingPeriod = keyof typeof RANKING_PERIODS;

export const ROLES = { ADMIN: "管理者", STAFF: "スタッフ", THERAPIST: "セラピスト" } as const;
export type Role = keyof typeof ROLES;

export const INQUIRY_STATUS = { NEW: "未対応", IN_PROGRESS: "対応中", DONE: "対応済" } as const;

export const MEETING_METHODS = ["駅・指定場所で待ち合わせ", "利用場所へ直接訪問", "相談して決めたい"] as const;
export const PLACES = ["自宅", "ホテル（予約済み）", "ホテル（これから探す）", "その他・相談"] as const;
export const PAYMENT_METHODS = ["現金", "クレジットカード", "電子決済", "相談したい"] as const;

export const SORT_OPTIONS = {
  recommend: "おすすめ順",
  shift: "出勤時間順",
  popular: "人気順",
  repeat: "リピート順",
  newcomer: "新人順",
  heightDesc: "身長が高い順",
  heightAsc: "身長が低い順",
  ageAsc: "年齢が若い順",
  ageDesc: "年齢が高い順",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

export const KANA_ROWS = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"] as const;

export function label<T extends Record<string, string>>(map: T, key: string): string {
  return (map as Record<string, string>)[key] ?? key;
}
