"use client";
import { useState, useTransition } from "react";
import { reviewSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { submitReview } from "@/lib/actions/public-forms";
import { Field, Honeypot } from "./FormBits";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TAGS = ["癒された", "会話が楽しい", "初めてでも安心", "マッサージ上手", "時間通り", "また会いたい"];

export function ReviewForm({ therapists, initialTherapist, formToken, today }: { therapists: { slug: string; name: string }[]; initialTherapist: string; formToken: string; today: string }) {
  const [f, setF] = useState({ therapist: initialTherapist, nickname: "", visitDate: "", rating: 0, title: "", body: "", tags: [] as string[] });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [msg, setMsg] = useState("");
  const [hp, setHp] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  if (done)
    return (
      <div className="card p-8 text-center">
        <Icon name="check" className="mx-auto h-10 w-10 text-ok" />
        <p className="mt-3 font-serif text-lg">口コミを受け付けました</p>
        <p className="mt-1 text-sm text-muted">スタッフによる確認後に公開されます。ありがとうございました。</p>
      </div>
    );

  return (
    <form
      noValidate
      className="card space-y-5 p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const r = reviewSchema.safeParse(f);
        if (!r.success) return setErrors(toFieldErrors(r.error));
        start(async () => {
          const res = await submitReview(f, formToken, hp);
          if (res.ok) setDone(true);
          else {
            setMsg(res.message);
            setErrors(res.fieldErrors ?? {});
          }
        });
      }}
    >
      {msg && <p role="alert" className="rounded-xl bg-danger/5 px-4 py-3 text-sm text-danger">{msg}</p>}
      <Honeypot value={hp} onChange={setHp} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="セラピスト" required error={errors.therapist}>
          <select value={f.therapist} onChange={(e) => set("therapist", e.target.value)} className="field">
            <option value="">選択してください</option>
            {therapists.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="ご利用日" required error={errors.visitDate}>
          <input type="date" max={today} value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} className="field" />
        </Field>
      </div>
      <Field label="評価" required error={errors.rating}>
        <div className="flex gap-1" role="radiogroup" aria-label="評価">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n}つ星`} onClick={() => set("rating", n)} className="text-gold">
              <Icon name="star" filled={n <= f.rating} className="h-8 w-8" />
            </button>
          ))}
        </div>
      </Field>
      <Field label="ニックネーム" required error={errors.nickname}>
        <input value={f.nickname} onChange={(e) => set("nickname", e.target.value)} maxLength={30} className="field" />
      </Field>
      <Field label="タイトル" required error={errors.title}>
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={60} className="field" />
      </Field>
      <Field label="本文" required error={errors.body} hint="20文字以上。個人を特定できる情報は記載しないでください。">
        <textarea value={f.body} onChange={(e) => set("body", e.target.value)} rows={6} maxLength={2000} className="field" />
      </Field>
      <Field label="タグ（任意）">
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => {
            const on = f.tags.includes(t);
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => set("tags", on ? f.tags.filter((x) => x !== t) : [...f.tags, t])} className={cn("chip h-9 px-3.5 text-[13px]", on && "chip-active")}>
                {t}
              </button>
            );
          })}
        </div>
      </Field>
      <button disabled={pending} className="h-14 w-full rounded-full bg-ink text-ivory disabled:opacity-60">
        {pending ? "送信中…" : "口コミを投稿する"}
      </button>
      <p className="text-center text-xs text-muted">投稿された口コミはスタッフの確認後に公開されます。</p>
    </form>
  );
}
