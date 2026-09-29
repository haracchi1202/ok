"use client";

import type { FormState } from "@/lib/admin/form";
import { RESERVATION_STATUS } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";

type A = (s: FormState, fd: FormData) => Promise<FormState>;

export function StatusForm({ action, status }: { action: A; status: string }) {
  const { state, onSubmit, pending } = useAdminForm(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="ステータス" name="status" error={state.errors?.status} className="flex-1">
          <select id="status" name="status" defaultValue={status} className="field">
            {Object.entries(RESERVATION_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton pending={pending} className="h-11">
          変更
        </SubmitButton>
      </div>
      <p className="text-xs text-muted">「確定」にすると第一希望セラピストの該当時間の予約枠が「予約済」になり、「キャンセル」で空きに戻ります。</p>
    </form>
  );
}

export function MemoForm({ action, memo }: { action: A; memo: string }) {
  const { state, onSubmit, pending } = useAdminForm(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <Field label="管理メモ (お客様には表示されません)" name="adminMemo" error={state.errors?.adminMemo}>
        <textarea id="adminMemo" name="adminMemo" rows={5} defaultValue={memo} className="field" />
      </Field>
      <SubmitButton pending={pending}>メモを保存</SubmitButton>
    </form>
  );
}
