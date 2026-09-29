import type { Role } from "@/lib/constants";
import type { IconName } from "@/components/ui/Icon";

// サイドバーのメニュー定義。roles 未指定 = 全ロール
export type NavItem = { href: string; label: string; icon: IconName; roles?: Role[] };
export type NavSection = { title: string; items: NavItem[] };

const STAFF: Role[] = ["ADMIN", "STAFF"];

export const NAV: NavSection[] = [
  {
    title: "運営",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: "home" },
      { href: "/admin/reservations", label: "予約管理", icon: "calendar", roles: STAFF },
      { href: "/admin/schedules", label: "出勤・予約枠", icon: "clock" },
      { href: "/admin/inquiries", label: "お問い合わせ", icon: "chat", roles: STAFF },
    ],
  },
  {
    title: "セラピスト",
    items: [
      { href: "/admin/therapists", label: "セラピスト", icon: "user", roles: STAFF },
      { href: "/admin/profile", label: "マイプロフィール", icon: "user", roles: ["THERAPIST"] },
      { href: "/admin/diaries", label: "写メ日記", icon: "pen" },
      { href: "/admin/reviews", label: "口コミ", icon: "star", roles: STAFF },
      { href: "/admin/rankings", label: "ランキング", icon: "crown", roles: STAFF },
      { href: "/admin/tags", label: "タグ", icon: "filter", roles: STAFF },
      { href: "/admin/profile-questions", label: "プロフィール質問", icon: "info", roles: STAFF },
    ],
  },
  {
    title: "コンテンツ",
    items: [
      { href: "/admin/news", label: "お知らせ", icon: "info", roles: STAFF },
      { href: "/admin/events", label: "イベント", icon: "sparkle", roles: STAFF },
      { href: "/admin/features", label: "特集・動画", icon: "play", roles: STAFF },
      { href: "/admin/faqs", label: "よくある質問", icon: "chat", roles: STAFF },
      { href: "/admin/banners", label: "バナー", icon: "external", roles: STAFF },
      { href: "/admin/pages", label: "固定ページ", icon: "pen", roles: STAFF },
    ],
  },
  {
    title: "料金",
    items: [
      { href: "/admin/courses", label: "コース", icon: "yen", roles: STAFF },
      { href: "/admin/options", label: "オプション", icon: "yen", roles: STAFF },
      { href: "/admin/areas", label: "エリア・交通費", icon: "map", roles: STAFF },
      { href: "/admin/price-rules", label: "料金ルール", icon: "yen", roles: STAFF },
      { href: "/admin/campaigns", label: "キャンペーン", icon: "sparkle", roles: STAFF },
    ],
  },
  {
    title: "システム",
    items: [
      { href: "/admin/settings", label: "サイト設定", icon: "filter", roles: STAFF },
      { href: "/admin/users", label: "管理ユーザー", icon: "user", roles: ["ADMIN"] },
      { href: "/admin/audit", label: "操作ログ", icon: "sort", roles: ["ADMIN"] },
      { href: "/admin/mails", label: "メールログ", icon: "chat", roles: STAFF },
    ],
  },
];

export function navFor(role: Role): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter((s) => s.items.length > 0);
}
