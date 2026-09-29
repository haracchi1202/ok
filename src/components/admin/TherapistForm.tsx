"use client";

import Link from "next/link";
import type { FormState } from "@/lib/admin/form";
import { TAG_GROUPS, THERAPIST_STATUS } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";
import { b } from "./ui";

export type TherapistValues = Record<string, string | boolean>;

type Props = {
  mode: "full" | "self";
  values: TherapistValues;
  tagIds: string[];
  tags: { id: string; name: string; group: string }[];
  questions: { id: string; question: string; answer: string }[];
  areas: { id: string; name: string }[];
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  cancelHref?: string;
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-4 sm:p-6">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function TherapistForm({ mode, values, tagIds, tags, questions, areas, action, cancelHref }: Props) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const e = state.errors ?? {};
  const v = (k: string) => (values[k] as string) ?? "";
  const text = (name: string, label: string, opts: { required?: boolean; type?: string; hint?: string; full?: boolean; placeholder?: string } = {}) => (
    <Field label={label} name={name} error={e[name]} required={opts.required} hint={opts.hint} className={opts.full ? "sm:col-span-2" : undefined}>
      <input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={v(name)}
        placeholder={opts.placeholder}
        aria-invalid={e[name] ? true : undefined}
        className="field"
      />
    </Field>
  );
  const area = (name: string, label: string, rows = 5, hint?: string) => (
    <Field label={label} name={name} error={e[name]} hint={hint} className="sm:col-span-2">
      <textarea id={name} name={name} rows={rows} defaultValue={v(name)} className="field" />
    </Field>
  );
  const check = (name: string, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={values[name] === true} className="h-4 w-4 accent-ink" />
      {label}
    </label>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      {mode === "full" && (
        <Box title="基本情報">
          {text("name", "名前", { required: true })}
          {text("nameKana", "ふりがな", { required: true, hint: "ひらがな (頭文字検索に使用)" })}
          {text("slug", "スラッグ (URL)", { hint: "半角英小文字・数字・ハイフン。空欄なら自動生成" })}
          <Field label="ステータス" name="status" error={e.status}>
            <select id="status" name="status" defaultValue={v("status") || "ACTIVE"} className="field">
              {Object.entries(THERAPIST_STATUS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {text("age", "年齢", { required: true, type: "number" })}
          {text("height", "身長 (cm)", { required: true, type: "number" })}
          {text("joinedAt", "入店日", { required: true, type: "date" })}
          <Field label="現在の対応エリア" name="currentAreaId" error={e.currentAreaId}>
            <select id="currentAreaId" name="currentAreaId" defaultValue={v("currentAreaId")} className="field">
              <option value="">未設定</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          {text("nominationFee", "個別指名料 (円)", { type: "number", hint: "空欄なら料金マスターの指名料を使用" })}
          {text("recommendOrder", "おすすめ順", { type: "number", hint: "小さいほど上位に表示" })}
          {text("popularityScore", "人気スコア", { type: "number", hint: "ランキング未設定時の人気順に使用" })}
          {text("repeatScore", "リピートスコア", { type: "number" })}
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            {check("isNewcomer", "新人")}
            {check("canOvernight", "宿泊対応")}
          </div>
        </Box>
      )}

      <Box title="紹介文">
        {text("catchCopy", "キャッチコピー", { full: true })}
        {mode === "full" && area("shopComment", "店舗からの紹介文", 6)}
        {area("selfMessage", "本人からのメッセージ", 6)}
      </Box>

      {mode === "full" && (
        <fieldset className="rounded-xl border border-line bg-white p-4 sm:p-6">
          <legend className="px-1 text-sm font-semibold">タグ</legend>
          {tags.length === 0 && <p className="text-sm text-muted">タグが登録されていません。</p>}
          <div className="space-y-3">
            {Object.entries(TAG_GROUPS).map(([g, label]) => {
              const list = tags.filter((t) => t.group === g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <p className="mb-1.5 text-xs text-muted">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((t) => (
                      <label key={t.id} className="chip cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ivory">
                        <input type="checkbox" name="tagIds" value={t.id} defaultChecked={tagIds.includes(t.id)} className="sr-only" />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="rounded-xl border border-line bg-white p-4 sm:p-6">
        <legend className="px-1 text-sm font-semibold">プロフィール質問</legend>
        {questions.length === 0 && <p className="text-sm text-muted">有効な質問がありません。</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <Field key={q.id} label={q.question} name={`answer_${q.id}`}>
              <input id={`answer_${q.id}`} name={`answer_${q.id}`} defaultValue={q.answer} maxLength={500} className="field" />
            </Field>
          ))}
        </div>
      </fieldset>

      <Box title="動画・SNS">
        {mode === "full" && text("videoUrl", "動画URL", { full: true, placeholder: "https://www.youtube.com/watch?v=…" })}
        {text("snsX", "X (旧Twitter)", { placeholder: "https://x.com/…" })}
        {text("snsInstagram", "Instagram", { placeholder: "https://instagram.com/…" })}
        {text("snsTiktok", "TikTok", { placeholder: "https://www.tiktok.com/@…" })}
      </Box>

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-line bg-ivory/95 py-3 backdrop-blur">
        <SubmitButton pending={pending} />
        {cancelHref && (
          <Link href={cancelHref} className={b("secondary")}>
            一覧へ戻る
          </Link>
        )}
      </div>
    </form>
  );
}
