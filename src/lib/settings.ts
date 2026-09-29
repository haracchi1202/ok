import { cache } from "react";
import { prisma } from "./db";

// 店舗情報・外部導線・SEO など、コードを変更せずに管理画面から編集する設定値
export const SETTING_DEFS = {
  site_name: { label: "サイト名", default: "LUEUR", group: "店舗情報" },
  site_tagline: { label: "キャッチコピー", default: "あなたの夜に、やさしい灯りを。", group: "店舗情報" },
  site_description: {
    label: "サイト説明 (meta description)",
    default: "女性のためのセラピスト予約ポータル。今日会えるセラピスト、出勤・空き状況、料金シミュレーション、口コミから安心してご予約いただけます。",
    group: "SEO",
    multiline: true,
  },
  business_hours: { label: "営業時間", default: "12:00〜翌5:00", group: "店舗情報" },
  service_area: { label: "対応エリア (表示用)", default: "東京23区・一部近郊", group: "店舗情報" },
  company_name: { label: "運営者名", default: "（運営者名を設定してください）", group: "店舗情報" },
  phone: { label: "電話番号", default: "03-0000-0000", group: "外部導線" },
  phone_hours: { label: "電話受付時間", default: "12:00〜翌3:00", group: "外部導線" },
  line_url: { label: "公式メッセージ (LINE等) URL", default: "https://line.me/", group: "外部導線" },
  line_label: { label: "公式メッセージ ボタン名", default: "LINEで相談", group: "外部導線" },
  external_reserve_url: { label: "外部予約URL (任意)", default: "", group: "外部導線" },
  sns_x: { label: "X (旧Twitter) URL", default: "", group: "SNS" },
  sns_instagram: { label: "Instagram URL", default: "", group: "SNS" },
  sns_tiktok: { label: "TikTok URL", default: "", group: "SNS" },
  admin_notify_email: { label: "予約通知先メール", default: "admin@example.com", group: "通知" },
  reservation_lead_minutes: { label: "予約受付の最短リードタイム(分)", default: "60", group: "予約" },
  slot_minutes: { label: "予約枠の単位(分)", default: "60", group: "予約" },
  now_window_minutes: { label: "「今すぐ会える」判定の範囲(分)", default: "120", group: "予約" },
  reservation_notice: {
    label: "予約フォーム上部の案内文",
    default: "送信後、担当スタッフより確認のご連絡を差し上げた時点で予約確定となります。",
    group: "予約",
    multiline: true,
  },
  age_gate_enabled: { label: "年齢確認ゲートを有効化 (1=有効)", default: "0", group: "コンプライアンス" },
  age_gate_message: {
    label: "年齢確認メッセージ",
    default: "当サイトは18歳以上の方を対象としています。あなたは18歳以上ですか？",
    group: "コンプライアンス",
    multiline: true,
  },
  legal_notice_enabled: { label: "フッターに法定表記ページを表示 (1=表示)", default: "0", group: "コンプライアンス" },
  og_image: { label: "デフォルトOGP画像パス", default: "/og-default.png", group: "SEO" },
  analytics_note: { label: "(メモ) 計測タグ等の運用メモ", default: "", group: "SEO", multiline: true },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.siteSetting.findMany();
  const out = {} as Settings;
  for (const k of Object.keys(SETTING_DEFS) as SettingKey[]) out[k] = SETTING_DEFS[k].default;
  for (const r of rows) if (r.key in SETTING_DEFS) out[r.key as SettingKey] = r.value;
  return out;
});

export function settingNumber(s: Settings, key: SettingKey, fallback: number): number {
  const n = Number(s[key]);
  return Number.isFinite(n) ? n : fallback;
}

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
