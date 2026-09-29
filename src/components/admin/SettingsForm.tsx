"use client";

import type { FormState } from "@/lib/admin/form";
import { Field, FormMessage, SubmitButton, useAdminForm } from "./client";

type Def = { key: string; label: string; group: string; multiline: boolean; value: string; default: string };

export function SettingsForm({ defs, action }: { defs: Def[]; action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const groups = [...new Set(defs.map((d) => d.group))];
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      {groups.map((g) => (
        <fieldset key={g} className="rounded-xl border border-line bg-white p-4 sm:p-6">
          <legend className="px-1 text-sm font-semibold">{g}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {defs
              .filter((d) => d.group === g)
              .map((d) => (
                <Field
                  key={d.key}
                  label={d.label}
                  name={d.key}
                  error={state.errors?.[d.key]}
                  hint={d.default ? `初期値: ${d.default.length > 40 ? `${d.default.slice(0, 40)}…` : d.default}` : undefined}
                  className={d.multiline ? "sm:col-span-2" : undefined}
                >
                  {d.multiline ? (
                    <textarea id={d.key} name={d.key} rows={3} defaultValue={d.value} className="field" />
                  ) : (
                    <input id={d.key} name={d.key} defaultValue={d.value} className="field" />
                  )}
                </Field>
              ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-0 border-t border-line bg-ivory/95 py-3 backdrop-blur">
        <SubmitButton pending={pending}>設定を保存</SubmitButton>
      </div>
    </form>
  );
}
