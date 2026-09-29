import type { Role } from "@/lib/constants";
import { DIARY_STATUS, TAG_GROUPS } from "@/lib/constants";
import type { PillTone } from "@/components/admin/ui";

// 設定駆動の汎用 CRUD 定義。単純なモデルはここに追記するだけで一覧・作成・編集・削除が揃う。

export type FieldType =
  | "text"
  | "textarea"
  | "markup" // 本文 (軽量マークアップ)
  | "url"
  | "number"
  | "boolean"
  | "select"
  | "datetime" // datetime-local (JST)
  | "date" // YYYY-MM-DD
  | "image"
  | "slug"
  | "therapist" // セラピスト単一選択
  | "therapists"; // セラピスト複数選択 (中間テーブル)

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  help?: string;
  placeholder?: string;
  options?: Record<string, string>;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: { re: string; message: string };
  unique?: boolean;
  preset?: "therapist" | "diary" | "banner" | "wide";
  thumbField?: string; // 画像のサムネイルパスを保存する列
  slugPrefix?: string;
  defaultValue?: string | number | boolean;
  full?: boolean; // 2 カラムレイアウトで全幅表示
};

export type ColumnKind = "text" | "bool" | "datetime" | "select" | "yen" | "number" | "image" | "therapist" | "therapistCount";
export type Column = { name: string; label: string; kind?: ColumnKind };

type Row = Record<string, unknown>;

export type ResourceDef = {
  key: string; // URL セグメント
  model: string; // prisma のデリゲート名
  entity: string; // 監査ログ用
  label: string;
  description?: string;
  roles?: Role[]; // 未指定 = ADMIN / STAFF
  ownerField?: "therapistId"; // THERAPIST は自分の行のみ
  fields: FieldDef[];
  titleField: string;
  columns: Column[];
  search: string[];
  filters?: string[];
  orderBy: Record<string, "asc" | "desc">[];
  badges?: (row: Row) => { label: string; tone: PillTone }[];
  validate?: (data: Row) => Record<string, string> | null;
  publicPath?: (row: Row) => string | null;
};

const published = { name: "isPublished", label: "公開する", type: "boolean", defaultValue: true } as const satisfies FieldDef;
const active = { name: "isActive", label: "有効", type: "boolean", defaultValue: true } as const satisfies FieldDef;
const sortOrder = { name: "sortOrder", label: "表示順", type: "number", defaultValue: 100, help: "小さいほど上に表示されます" } as const satisfies FieldDef;
const slug = (prefix: string): FieldDef => ({
  name: "slug",
  label: "スラッグ (URL)",
  type: "slug",
  unique: true,
  slugPrefix: prefix,
  help: "半角英小文字・数字・ハイフン。空欄なら自動生成します",
});
const periodCheck = (d: Row) => {
  const s = d.startsAt as Date | null | undefined;
  const e = d.endsAt as Date | null | undefined;
  return s && e && e < s ? { endsAt: "終了日時は開始日時より後にしてください" } : null;
};
const inPeriod = (row: Row) => {
  const now = new Date();
  const s = row.startsAt as Date | null;
  const e = row.endsAt as Date | null;
  if (e && e < now) return [{ label: "期間終了", tone: "gray" as const }];
  if (s && s > now) return [{ label: "開始前", tone: "warn" as const }];
  return [];
};

export const NEWS_CATEGORIES = { NEWS: "お知らせ", IMPORTANT: "重要", TOPICS: "トピックス" };

export const RESOURCES: ResourceDef[] = [
  {
    key: "news",
    model: "news",
    entity: "News",
    label: "お知らせ",
    fields: [
      { name: "title", label: "タイトル", type: "text", required: true, full: true },
      slug("n-"),
      { name: "category", label: "カテゴリ", type: "select", options: NEWS_CATEGORIES, defaultValue: "NEWS" },
      { name: "publishedAt", label: "公開日時", type: "datetime", help: "空欄なら現在日時。未来日時にすると予約公開になります" },
      { name: "isImportant", label: "重要なお知らせとして強調", type: "boolean" },
      published,
      { name: "body", label: "本文", type: "markup", full: true },
    ],
    titleField: "title",
    columns: [
      { name: "title", label: "タイトル" },
      { name: "category", label: "カテゴリ", kind: "select" },
      { name: "publishedAt", label: "公開日時", kind: "datetime" },
      { name: "isPublished", label: "公開", kind: "bool" },
    ],
    search: ["title", "body"],
    filters: ["category", "isPublished"],
    orderBy: [{ publishedAt: "desc" }],
    badges: (r) => (r.isPublished && (r.publishedAt as Date) > new Date() ? [{ label: "予約公開", tone: "warn" }] : []),
    publicPath: (r) => `/news/${r.slug}`,
  },
  {
    key: "events",
    model: "event",
    entity: "Event",
    label: "イベント",
    fields: [
      { name: "title", label: "タイトル", type: "text", required: true, full: true },
      slug("e-"),
      sortOrder,
      { name: "startsAt", label: "開始日時", type: "datetime", nullable: true },
      { name: "endsAt", label: "終了日時", type: "datetime", nullable: true },
      published,
      { name: "summary", label: "概要", type: "textarea", maxLength: 500, full: true },
      { name: "imagePath", label: "メイン画像", type: "image", preset: "wide", full: true },
      { name: "therapists", label: "参加セラピスト", type: "therapists", full: true },
      { name: "body", label: "本文", type: "markup", full: true },
    ],
    titleField: "title",
    columns: [
      { name: "imagePath", label: "画像", kind: "image" },
      { name: "title", label: "タイトル" },
      { name: "startsAt", label: "開始", kind: "datetime" },
      { name: "endsAt", label: "終了", kind: "datetime" },
      { name: "therapists", label: "参加", kind: "therapistCount" },
      { name: "isPublished", label: "公開", kind: "bool" },
    ],
    search: ["title", "summary"],
    filters: ["isPublished"],
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
    badges: inPeriod,
    validate: periodCheck,
    publicPath: (r) => `/events/${r.slug}`,
  },
  {
    key: "features",
    model: "feature",
    entity: "Feature",
    label: "特集・動画",
    fields: [
      { name: "title", label: "タイトル", type: "text", required: true, full: true },
      slug("f-"),
      { name: "kind", label: "種別", type: "select", options: { ARTICLE: "記事", VIDEO: "動画" }, defaultValue: "ARTICLE" },
      { name: "publishedAt", label: "公開日時", type: "datetime", help: "空欄なら現在日時" },
      published,
      { name: "videoUrl", label: "動画URL", type: "url", nullable: true, help: "YouTube / Vimeo の URL", full: true },
      { name: "summary", label: "概要", type: "textarea", maxLength: 500, full: true },
      { name: "imagePath", label: "サムネイル画像", type: "image", preset: "wide", full: true },
      { name: "therapistSlugs", label: "関連セラピスト (スラッグをカンマ区切り)", type: "text", placeholder: "ao,rin", full: true },
      { name: "body", label: "本文", type: "markup", full: true },
    ],
    titleField: "title",
    columns: [
      { name: "imagePath", label: "画像", kind: "image" },
      { name: "title", label: "タイトル" },
      { name: "kind", label: "種別", kind: "select" },
      { name: "publishedAt", label: "公開日時", kind: "datetime" },
      { name: "isPublished", label: "公開", kind: "bool" },
    ],
    search: ["title", "summary"],
    filters: ["kind", "isPublished"],
    orderBy: [{ publishedAt: "desc" }],
    publicPath: (r) => `/features/${r.slug}`,
  },
  {
    key: "faqs",
    model: "faq",
    entity: "Faq",
    label: "よくある質問",
    fields: [
      { name: "category", label: "カテゴリ", type: "text", required: true, defaultValue: "一般", maxLength: 50 },
      sortOrder,
      { name: "question", label: "質問", type: "text", required: true, full: true, maxLength: 300 },
      { name: "answer", label: "回答", type: "markup", required: true, full: true },
      published,
    ],
    titleField: "question",
    columns: [
      { name: "category", label: "カテゴリ" },
      { name: "question", label: "質問" },
      { name: "sortOrder", label: "順", kind: "number" },
      { name: "isPublished", label: "公開", kind: "bool" },
    ],
    search: ["question", "answer", "category"],
    filters: ["isPublished"],
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  },
  {
    key: "banners",
    model: "banner",
    entity: "Banner",
    label: "バナー",
    fields: [
      { name: "title", label: "タイトル", type: "text", required: true },
      { name: "subtitle", label: "サブタイトル", type: "text" },
      { name: "position", label: "表示位置", type: "select", options: { HOME_MAIN: "トップ メイン", HOME_SUB: "トップ サブ" }, defaultValue: "HOME_MAIN" },
      { name: "linkUrl", label: "リンク先", type: "url", placeholder: "/campaign または https://…" },
      { name: "startsAt", label: "掲載開始", type: "datetime", nullable: true },
      { name: "endsAt", label: "掲載終了", type: "datetime", nullable: true },
      sortOrder,
      active,
      { name: "imagePath", label: "バナー画像 (推奨 1600×800)", type: "image", preset: "banner", full: true },
    ],
    titleField: "title",
    columns: [
      { name: "imagePath", label: "画像", kind: "image" },
      { name: "title", label: "タイトル" },
      { name: "position", label: "位置", kind: "select" },
      { name: "sortOrder", label: "順", kind: "number" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["title", "subtitle"],
    filters: ["position", "isActive"],
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
    badges: inPeriod,
    validate: periodCheck,
  },
  {
    key: "pages",
    model: "page",
    entity: "Page",
    label: "固定ページ",
    description: "公開サイトで使用するスラッグ: guide / about / access / terms / privacy / cancel-policy / prohibited / legal",
    fields: [
      { name: "title", label: "タイトル", type: "text", required: true },
      { ...slug("p-"), help: "公開サイトのページと対応します (例: terms)。空欄なら自動生成" },
      { name: "seoDescription", label: "SEO 説明文", type: "textarea", maxLength: 300, full: true },
      published,
      { name: "body", label: "本文", type: "markup", full: true },
    ],
    titleField: "title",
    columns: [
      { name: "title", label: "タイトル" },
      { name: "slug", label: "スラッグ" },
      { name: "isPublished", label: "公開", kind: "bool" },
    ],
    search: ["title", "slug", "body"],
    orderBy: [{ createdAt: "asc" }],
    publicPath: (r) => (["about", "access", "guide", "privacy", "terms"].includes(String(r.slug)) ? `/${r.slug}` : `/p/${r.slug}`),
  },
  {
    key: "tags",
    model: "tag",
    entity: "Tag",
    label: "タグ",
    fields: [
      { name: "name", label: "タグ名", type: "text", required: true, maxLength: 50 },
      { ...slug("t-"), help: "絞り込み URL に使われます。空欄なら自動生成" },
      { name: "group", label: "グループ", type: "select", options: TAG_GROUPS, defaultValue: "FEATURE" },
      sortOrder,
      active,
    ],
    titleField: "name",
    columns: [
      { name: "name", label: "タグ名" },
      { name: "slug", label: "スラッグ" },
      { name: "group", label: "グループ", kind: "select" },
      { name: "sortOrder", label: "順", kind: "number" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["name", "slug"],
    filters: ["group", "isActive"],
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  },
  {
    key: "profile-questions",
    model: "profileQuestion",
    entity: "ProfileQuestion",
    label: "プロフィール質問",
    description: "セラピストのプロフィールに表示する質問項目です。",
    fields: [
      { name: "question", label: "質問", type: "text", required: true, full: true, maxLength: 100 },
      sortOrder,
      active,
    ],
    titleField: "question",
    columns: [
      { name: "question", label: "質問" },
      { name: "sortOrder", label: "順", kind: "number" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["question"],
    filters: ["isActive"],
    orderBy: [{ sortOrder: "asc" }],
  },
  {
    key: "courses",
    model: "course",
    entity: "Course",
    label: "コース",
    fields: [
      { name: "name", label: "コース名", type: "text", required: true },
      { name: "minutes", label: "時間 (分)", type: "number", required: true, min: 1, max: 1440 },
      { name: "price", label: "料金 (円)", type: "number", required: true, min: 0 },
      sortOrder,
      { name: "isOvernight", label: "宿泊コース", type: "boolean" },
      active,
      { name: "description", label: "説明", type: "textarea", maxLength: 500, full: true },
    ],
    titleField: "name",
    columns: [
      { name: "name", label: "コース名" },
      { name: "minutes", label: "分", kind: "number" },
      { name: "price", label: "料金", kind: "yen" },
      { name: "isOvernight", label: "宿泊", kind: "bool" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["name"],
    filters: ["isActive"],
    orderBy: [{ sortOrder: "asc" }, { minutes: "asc" }],
  },
  {
    key: "options",
    model: "option",
    entity: "Option",
    label: "オプション",
    fields: [
      { name: "name", label: "オプション名", type: "text", required: true },
      { name: "price", label: "料金 (円)", type: "number", required: true, min: 0 },
      sortOrder,
      active,
      { name: "description", label: "説明", type: "textarea", maxLength: 500, full: true },
    ],
    titleField: "name",
    columns: [
      { name: "name", label: "オプション名" },
      { name: "price", label: "料金", kind: "yen" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["name"],
    filters: ["isActive"],
    orderBy: [{ sortOrder: "asc" }],
  },
  {
    key: "areas",
    model: "area",
    entity: "Area",
    label: "エリア・交通費",
    fields: [
      { name: "name", label: "エリア名", type: "text", required: true },
      { ...slug("a-"), help: "空欄なら自動生成" },
      { name: "transportFee", label: "交通費 (円)", type: "number", min: 0, defaultValue: 0 },
      sortOrder,
      active,
      { name: "note", label: "備考", type: "textarea", maxLength: 500, full: true },
    ],
    titleField: "name",
    columns: [
      { name: "name", label: "エリア名" },
      { name: "transportFee", label: "交通費", kind: "yen" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["name"],
    filters: ["isActive"],
    orderBy: [{ sortOrder: "asc" }],
  },
  {
    key: "price-rules",
    model: "priceRule",
    entity: "PriceRule",
    label: "料金ルール",
    description:
      "料金計算で使われるキー: nomination_first / nomination_repeat / extension_fee / extension_unit_minutes / late_night_fee / late_night_start_hour / late_night_end_hour",
    fields: [
      { name: "key", label: "キー", type: "text", required: true, unique: true, pattern: { re: "^[a-z0-9_]+$", message: "半角英小文字・数字・_ のみ使用できます" } },
      { name: "label", label: "表示名", type: "text", required: true },
      { name: "amount", label: "値 (円 / 分 / 時)", type: "number", required: true },
      sortOrder,
      { name: "note", label: "備考", type: "textarea", maxLength: 500, full: true },
    ],
    titleField: "label",
    columns: [
      { name: "key", label: "キー" },
      { name: "label", label: "表示名" },
      { name: "amount", label: "値", kind: "number" },
    ],
    search: ["key", "label"],
    orderBy: [{ sortOrder: "asc" }],
  },
  {
    key: "campaigns",
    model: "campaign",
    entity: "Campaign",
    label: "キャンペーン",
    fields: [
      { name: "name", label: "キャンペーン名", type: "text", required: true },
      { name: "discountType", label: "割引種別", type: "select", options: { AMOUNT: "定額 (円)", PERCENT: "割合 (%)" }, defaultValue: "AMOUNT" },
      { name: "value", label: "割引値", type: "number", required: true, min: 0 },
      { name: "target", label: "対象", type: "select", options: { ALL: "全員", FIRST: "初回のみ", REPEAT: "リピートのみ" }, defaultValue: "ALL" },
      { name: "minCourseMinutes", label: "最低コース時間 (分)", type: "number", min: 0, defaultValue: 0 },
      sortOrder,
      { name: "startsAt", label: "開始日時", type: "datetime", nullable: true },
      { name: "endsAt", label: "終了日時", type: "datetime", nullable: true },
      active,
      { name: "description", label: "説明", type: "textarea", maxLength: 500, full: true },
    ],
    titleField: "name",
    columns: [
      { name: "name", label: "名称" },
      { name: "discountType", label: "種別", kind: "select" },
      { name: "value", label: "値", kind: "number" },
      { name: "target", label: "対象", kind: "select" },
      { name: "endsAt", label: "終了", kind: "datetime" },
      { name: "isActive", label: "有効", kind: "bool" },
    ],
    search: ["name"],
    filters: ["target", "isActive"],
    orderBy: [{ sortOrder: "asc" }],
    badges: inPeriod,
    validate: (d) => {
      if (d.discountType === "PERCENT" && ((d.value as number) < 1 || (d.value as number) > 100)) return { value: "割合は 1〜100 で入力してください" };
      return periodCheck(d);
    },
  },
  {
    key: "diaries",
    model: "diary",
    entity: "Diary",
    label: "写メ日記",
    roles: ["ADMIN", "STAFF", "THERAPIST"],
    ownerField: "therapistId",
    fields: [
      { name: "therapistId", label: "セラピスト", type: "therapist", required: true },
      { name: "title", label: "タイトル", type: "text", required: true, maxLength: 100 },
      slug("d-"),
      { name: "status", label: "状態", type: "select", options: DIARY_STATUS, defaultValue: "DRAFT" },
      { name: "publishedAt", label: "公開日時", type: "datetime", help: "空欄なら現在日時。未来日時にすると予約公開になります" },
      { name: "imagePath", label: "写真", type: "image", preset: "diary", thumbField: "thumbPath", full: true },
      { name: "body", label: "本文", type: "textarea", required: true, maxLength: 5000, full: true },
    ],
    titleField: "title",
    columns: [
      { name: "thumbPath", label: "写真", kind: "image" },
      { name: "title", label: "タイトル" },
      { name: "therapistId", label: "セラピスト", kind: "therapist" },
      { name: "status", label: "状態", kind: "select" },
      { name: "publishedAt", label: "公開日時", kind: "datetime" },
    ],
    search: ["title", "body"],
    filters: ["therapistId", "status"],
    orderBy: [{ publishedAt: "desc" }],
    badges: (r) => (r.status === "PUBLISHED" && (r.publishedAt as Date) > new Date() ? [{ label: "予約公開", tone: "warn" }] : []),
    publicPath: (r) => `/diary/${r.slug}`,
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}

/** クライアントへ渡せる形 (関数を除く) */
export type ClientField = FieldDef;
