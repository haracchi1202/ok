"use client";

import { Field, FormMessage, SubmitButton, useAdminForm } from "@/components/admin/client";
import { loginAction } from "./actions";

export function LoginForm() {
  const { state, onSubmit, pending } = useAdminForm(loginAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="メールアドレス" name="email">
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </Field>
      <Field label="パスワード" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </Field>
      <SubmitButton pending={pending} className="w-full">
        ログイン
      </SubmitButton>
    </form>
  );
}
