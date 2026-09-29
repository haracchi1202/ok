"use client";

import Link from "next/link";
import type { FormState } from "@/lib/admin/form";
import { REVIEW_STATUS } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";
import { b } from "./ui";

type Values = { nickname: string; visitDate: string; rating: number; title: string; body: string; tags: string; shopReply: string; status: string };

export function ReviewForm({ values, action }: { values: Values; action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-6">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ニックネーム" name="nickname" error={e.nickname} required>
          <input id="nickname" name="nickname" defaultValue={values.nickname} className="field" />
        </Field>
        <Field label="ご利用日" name="visitDate" error={e.visitDate} required>
          <input id="visitDate" name="visitDate" type="date" defaultValue={values.visitDate} className="field" />
        </Field>
        <Field label="評価" name="rating" error={e.rating} required>
          <select id="rating" name="rating" defaultValue={values.rating} className="field">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </select>
        </Field>
        <Field label="状態" name="status" error={e.status}>
          <select id="status" name="status" defaultValue={values.status} className="field">
            {Object.entries(REVIEW_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="タイトル" name="title" error={e.title} required className="sm:col-span-2">
          <input id="title" name="title" defaultValue={values.title} className="field" />
        </Field>
        <Field label="本文" name="body" error={e.body} required className="sm:col-span-2">
          <textarea id="body" name="body" rows={6} defaultValue={values.body} className="field" />
        </Field>
        <Field label="タグ (カンマ区切り)" name="tags" error={e.tags} className="sm:col-span-2">
          <input id="tags" name="tags" defaultValue={values.tags} className="field" />
        </Field>
        <Field label="お店からの返信" name="shopReply" error={e.shopReply} className="sm:col-span-2">
          <textarea id="shopReply" name="shopReply" rows={4} defaultValue={values.shopReply} className="field" />
        </Field>
      </div>
      <div className="flex gap-2 border-t border-line pt-4">
        <SubmitButton pending={pending} />
        <Link href="/admin/reviews" className={b("secondary")}>
          キャンセル
        </Link>
      </div>
    </form>
  );
}
