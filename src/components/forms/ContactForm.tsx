"use client";
import { useState, useTransition } from "react";
import { contactSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { submitContact } from "@/lib/actions/public-forms";
import { Field, Honeypot } from "./FormBits";
import { Icon } from "@/components/ui/Icon";

const CATS = [
  ["GENERAL", "一般的なご質問"],
  ["RESERVATION", "予約について"],
  ["THERAPIST", "セラピストについて"],
  ["RECRUIT", "求人について"],
  ["OTHER", "その他"],
] as const;

export function ContactForm({ formToken, defaultMessage = "" }: { formToken: string; defaultMessage?: string }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", category: defaultMessage ? "THERAPIST" : "GENERAL", message: defaultMessage });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [hp, setHp] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  if (done)
    return (
      <div className="card p-8 text-center">
        <Icon name="check" className="mx-auto h-10 w-10 text-ok" />
        <p className="mt-3 font-serif text-lg">お問い合わせを受け付けました</p>
        <p className="mt-1 text-sm text-muted">確認メールをお送りしました。担当より順次ご連絡いたします。</p>
      </div>
    );

  return (
    <form
      noValidate
      className="card space-y-5 p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const r = contactSchema.safeParse(f);
        if (!r.success) return setErrors(toFieldErrors(r.error));
        start(async () => {
          const res = await submitContact(f, formToken, hp);
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
      <Field label="お問い合わせ種別" required>
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="field">
          {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="お名前（ニックネーム可）" required error={errors.name}>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={40} className="field" />
        </Field>
        <Field label="電話番号" error={errors.phone}>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" maxLength={20} className="field" />
        </Field>
      </div>
      <Field label="メールアドレス" required error={errors.email}>
        <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" maxLength={254} className="field" />
      </Field>
      <Field label="お問い合わせ内容" required error={errors.message}>
        <textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={6} maxLength={2000} className="field" />
      </Field>
      <button disabled={pending} className="h-14 w-full rounded-full bg-ink text-ivory disabled:opacity-60">
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
