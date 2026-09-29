"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormState } from "@/lib/admin/form";
import { ROLES } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";
import { b } from "./ui";

type Values = { email: string; name: string; role: string; therapistId: string; isActive: boolean };

export function UserForm({
  values,
  isNew,
  isSelf,
  therapists,
  action,
}: {
  values: Values;
  isNew: boolean;
  isSelf: boolean;
  therapists: { id: string; name: string }[];
  action: (s: FormState, fd: FormData) => Promise<FormState>;
}) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const [role, setRole] = useState(values.role);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-6">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="名前" name="name" error={e.name} required>
          <input id="name" name="name" defaultValue={values.name} className="field" />
        </Field>
        <Field label="メールアドレス (ログインID)" name="email" error={e.email} required>
          <input id="email" name="email" type="email" defaultValue={values.email} autoComplete="off" className="field" />
        </Field>
        <Field label="権限" name="role" error={e.role} required hint={isSelf ? "自分自身の権限は変更できません" : undefined}>
          <select id="role" name="role" value={role} onChange={(ev) => setRole(ev.target.value)} className="field">
            {Object.entries(ROLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {role === "THERAPIST" && (
          <Field label="紐づけるセラピスト" name="therapistId" error={e.therapistId} required>
            <select id="therapistId" name="therapistId" defaultValue={values.therapistId} className="field">
              <option value="">選択してください</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={isNew ? "パスワード" : "パスワード再設定"} name="password" error={e.password} required={isNew} hint={isNew ? "10 文字以上" : "変更する場合のみ入力 (10 文字以上)"}>
          <input id="password" name="password" type="password" autoComplete="new-password" className="field" />
        </Field>
        <div>
          <label className="flex h-full items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="h-4 w-4 accent-ink" />
            有効 (ログイン可能)
          </label>
          {e.isActive && <p className="text-xs text-danger">{e.isActive}</p>}
        </div>
      </div>
      <p className="text-xs text-muted">管理者: すべての操作 / スタッフ: ユーザー管理・操作ログ以外 / セラピスト: 自分の日記・プロフィール・出勤のみ</p>
      <div className="flex gap-2 border-t border-line pt-4">
        <SubmitButton pending={pending} />
        <Link href="/admin/users" className={b("secondary")}>
          キャンセル
        </Link>
      </div>
    </form>
  );
}
