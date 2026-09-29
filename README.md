# LUEUR — 女性向けセラピスト予約ポータル

「探す → 比較する → プロフィールを見る → 空き時間を見る → 料金を確認する → 予約する」を迷わず行えることを最優先に設計した、セラピスト予約ポータルです。
ブランド名・文章・画像はすべてオリジナル / 架空のサンプルです（サイト名などは管理画面から変更できます）。

- **フレームワーク**: Next.js 15 (App Router / Server Components / Server Actions) + TypeScript
- **DB**: Prisma 6 + SQLite（`provider` を変えれば PostgreSQL 等に移行可能）
- **UI**: Tailwind CSS v4（モバイルファースト、外部 UI ライブラリなし）
- **その他**: zod（入力検証）、jose（管理画面セッション JWT）、bcryptjs、sharp（画像最適化）、nodemailer

## セットアップ

```bash
cp .env.example .env         # AUTH_SECRET は 32 文字以上のランダム値に変更
npm install
npm run db:push              # スキーマ反映
npm run db:seed              # 架空のサンプルデータ投入（画像も生成）
npm run dev                  # http://localhost:3000
```

シードは **実行時点の現在時刻を基準に** 出勤・空き枠を生成するため、いつ実行しても「今すぐ会える」「本日出勤」「予約済」「受付終了」などの状態が確認できます。時間が経って表示が寂しくなったら `npm run db:seed` を再実行してください。

| 権限 | ログイン | パスワード |
| --- | --- | --- |
| 管理者 | admin@example.com | admin-password-123 |
| スタッフ | staff@example.com | staff-password-123 |
| セラピスト（蒼） | ao@example.com | therapist-password-123 |

管理画面: `/admin`

その他のコマンド: `npm run typecheck` / `npm run lint` / `npm test`（料金計算・日付またぎのユニットテスト） / `npm run build`

## サイトマップ

| 区分 | パス | 内容 |
| --- | --- | --- |
| ホーム | `/` | メインビジュアル → 重要なお知らせ → バナー → 今すぐ予約CTA → 本日の出勤人数 → 今すぐ会える → 人気/リピート/新人ランキング → 本日出勤 → 新人 → 日記 → 動画・特集 → 口コミ → 初めての方へ → 料金 → FAQ/ニュース → 予約CTA |
| 探す | `/therapists` | 複合検索（フリーワード・頭文字・年齢・身長・本日出勤・今すぐ予約可・宿泊対応・新人・特徴タグ AND）+ 9種の並び替え。条件は URL に保存 |
| | `/newcomers` `/today` | 新人一覧 / 本日出勤（同じ検索 UI をプリセット付きで利用） |
| | `/now` | 今すぐ会える（現在時刻 × 出勤 × 空き枠を照合、最短受付時刻を表示、2分ごとに自動更新） |
| | `/schedule` | 全員の出勤を日付単位で表示（今日/明日/明後日/7日/カレンダー + フィルター） |
| | `/therapists/[slug]` | 詳細（ギャラリー・ステータス・CTA・Q&Aプロフィール・7日分の出勤表→時間帯別空き・紹介文・本人メッセージ・動画・口コミ・日記・料金目安・対応サービス・ランキング実績・イベント・SNS・似たセラピスト） |
| 比較 | `/ranking` | 人気/リピート/新人/応援 × デイリー/週間/月間、UP/DOWN/NEW 表示 |
| | `/reviews` `/reviews/new` | 口コミ一覧（セラピスト絞り込み）/ 投稿（管理者承認後に公開） |
| | `/diary` `/diary/[slug]` | 日記一覧 / 詳細 |
| 料金・予約 | `/price` `/price/simulator` | 料金表 / リアルタイム料金シミュレーター（→「この内容で予約」） |
| | `/reserve` `/reserve/complete` | 予約フォーム（入力→確認→完了、受付番号発行） |
| 情報 | `/guide` `/about` `/access` `/faq` `/events` `/news` `/features` `/contact` | 初めての方へ・サービスについて・待ち合わせ/利用場所・FAQ・イベント・ニュース・動画/特集・お問い合わせ |
| 規約 | `/terms` `/privacy` `/p/cancel-policy` `/p/prohibited` `/p/legal` | すべて CMS（固定ページ）で編集 |
| その他 | `/favorites` `/sitemap.xml` `/robots.txt` | ログイン不要のお気に入り、SEO |

## 導線設計（参考サイト分析からの改善点）

- **どこからでも予約へ**: PC はヘッダー/プロフィール/料金/ページ下部に予約 CTA、スマホは画面下固定ナビ（ホーム・探す・今すぐ・スケジュール・**予約**）。プロフィールと料金シミュレーターではさらに「この人を予約」「この内容で予約」固定バーを表示。
- **空き時間から直接予約**: 出勤表の ◎ 枠をタップすると、セラピスト・日付・時刻が入力済みの予約フォームへ。予約フォーム内でもセラピストと日付を選ぶと空き枠が表示され、タップで時刻を選べる。
- **料金の不安を解消**: シミュレーターの選択内容（指名・初回/リピート・コース・延長・エリア・深夜・オプション・キャンペーン）が URL と予約フォームにそのまま引き継がれる。料金はサーバー側で再計算して保存。
- **比較しやすさ**: カードに年齢・身長・キャッチ・本日の出勤時間・予約可否・ランキング・NEW・特徴タグを統一表示。検索条件は URL に保存されるため戻る/共有でも状態が消えない。

## DB 設計（`prisma/schema.prisma`）

| モデル | 役割 |
| --- | --- |
| Therapist / TherapistImage | セラピスト本体・写真（大/サムネイルの2サイズ、sortOrder 0 がメイン） |
| Tag / TherapistTag | 特徴タグ（グループ: FEATURE/STYLE/SERVICE）。管理画面から自由に追加 |
| ProfileQuestion / ProfileAnswer | プロフィール質問（管理画面から自由に追加）と回答 |
| Schedule | 出勤（営業日 `date` + 実日時 `startAt/endAt`。**日付またぎ**をそのまま表現） |
| Availability | 時間帯別の予約枠（AVAILABLE / BOOKED / INQUIRY / CLOSED） |
| Course / Option / Area / PriceRule / Campaign | 料金マスター（コード内に金額を持たない） |
| Reservation | 構造化された予約（受付番号・閲覧トークン・料金明細 JSON・ステータス） |
| Review | 口コミ（PENDING → 承認で PUBLISHED） |
| Diary | 日記（下書き / 公開 / 未来日時で予約公開） |
| Ranking / RankingEntry | ランキング（種別×期間×開始日、前回順位で UP/DOWN/NEW。手動/自動集計の両対応） |
| Event(+EventTherapist) / News / Feature / Faq / Banner / Page | コンテンツ・固定ページ（規約類もここ） |
| AdminUser | 管理者・スタッフ・セラピスト（therapistId で本人と紐づけ） |
| SiteSetting | 店舗情報・電話番号・LINE URL・SNS・年齢確認ゲート等のキー/値 |
| AuditLog / MailLog / Inquiry | 監査ログ・メール送信ログ・お問い合わせ |

列挙値は DB 非依存にするため String で保持し、`src/lib/constants.ts` で定義しています。外部キー・index・createdAt/updatedAt を全モデルに設定済みです。

## 時刻の扱い

- 表示・入力はすべて JST。営業日は 6:00 切り替え（`src/lib/time.ts` の `BUSINESS_DAY_START_HOUR`）。
- 予約時刻は営業日基準の表記（`25:30` = 翌1:30）で扱い、画面では「翌1:30」と表示。

## コンポーネント構成（主なもの）

```
src/components/
  ui/         CTAButton, SectionHeader, Badge, TagChip, Icon, Breadcrumbs(+構造化データ), JsonLd,
              Pagination, RichText(安全な軽量マークアップ), Stars, States(Empty/Error/Skeleton), PageHero
  site/       Header, MobileMenu, MobileBottomNav, Footer, ReserveBand, AgeGate, DatePicker, AutoRefresh
  therapist/  TherapistCard, TherapistGrid/TherapistRow, SearchFilter, AvailabilityBadge, FavoriteButton,
              Gallery, ScheduleTable, TherapistListing, FavoritesList
  content/    ReviewCard, DiaryCard, RankingCard, NewsList, FaqList, PriceTable, CmsPage
  price/      PriceSimulator, PriceBreakdown
  forms/      ReservationForm, ContactForm, ReviewForm
src/lib/      therapists(検索・空き判定), content, pricing(共通料金計算), validation(zod), time, auth,
              settings, rate-limit, form-guard, audit, mail, storage, favorites ...
```

## セキュリティ

- **入力検証**: すべてのフォームを zod でクライアント・サーバー両方で検証。料金はサーバーで再計算。
- **CSRF**: 変更系はすべて Server Actions（Next.js の Origin 検証）+ SameSite=Lax の httpOnly Cookie。
- **XSS**: React のエスケープのみ使用。CMS 本文は HTML を解釈しない独自の軽量マークアップ。JSON-LD は `<` をエスケープ。CSP 等のセキュリティヘッダーを `next.config.ts` で付与。
- **SQL Injection**: Prisma のパラメータ化クエリのみ。
- **Rate Limit / BOT 対策**: 予約・問い合わせ・口コミ・ログイン・空き状況 API にレート制限、ハニーポット項目 + 署名付き表示時刻トークン（速すぎる送信・期限切れを拒否）。
- **管理画面**: middleware で JWT 検証 + 各ページ/各アクションで権限を再確認。セラピストは自分のデータのみ操作可能。操作は監査ログに記録。
- **個人情報**: 予約完了画面は受付番号 + ランダムトークンがないと表示しない。IP はハッシュ化して保存。画像は再エンコードで EXIF を除去。秘密情報は `.env` のみ（`NEXT_PUBLIC_` 以外はクライアントに露出しない）。

> レート制限はプロセス内メモリ実装です。複数インスタンスで運用する場合は Redis 等に差し替えてください（`src/lib/rate-limit.ts`）。アップロード画像はローカル（`UPLOAD_DIR`）に保存し `/media/*` で配信しています。本番でオブジェクトストレージを使う場合は `src/lib/storage.ts` を差し替えてください。

## 成人向けサービスとしての配慮

- 年齢確認ゲートは管理画面の設定（`age_gate_enabled`）で後から有効化できます。
- 利用規約・プライバシーポリシー・キャンセルポリシー・禁止事項・法令に基づく表記はすべて固定ページとして CMS 管理。**法令・行政上必要な表記はハードコードしていません**。運営者が専門家確認後に入力し、「フッターに法定表記ページを表示」を有効にしてください。
