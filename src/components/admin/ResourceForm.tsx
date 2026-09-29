"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/admin/form";
import type { FieldDef } from "@/lib/admin/resources";
import { Field, FormMessage, ImageInput, SubmitButton, useAdminForm } from "./client";
import { b, MarkupHint } from "./ui";

type Value = string | boolean | string[];

type Props = {
  fields: FieldDef[];
  values: Record<string, Value>;
  therapists: { id: string; name: string }[];
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  cancelHref: string;
  hidden?: string[]; // 表示しない項目 (THERAPIST の therapistId など)
};

function Input({ f, value, error, therapists }: { f: FieldDef; value: Value; error?: string; therapists: Props["therapists"] }) {
  const common = {
    id: f.name,
    name: f.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${f.name}-error` : undefined,
  };
  switch (f.type) {
    case "boolean":
      return (
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" {...common} defaultChecked={value === true} className="h-4 w-4 accent-ink" />
          {f.label}
        </label>
      );
    case "markup":
    case "textarea":
      return <textarea {...common} defaultValue={value as string} rows={f.type === "markup" ? 12 : 4} maxLength={f.maxLength} className="field font-mono text-sm" placeholder={f.placeholder} />;
    case "number":
      return <input type="number" inputMode="numeric" {...common} defaultValue={value as string} min={f.min} max={f.max} className="field" />;
    case "datetime":
      return <input type="datetime-local" {...common} defaultValue={value as string} className="field" />;
    case "date":
      return <input type="date" {...common} defaultValue={value as string} className="field" />;
    case "select":
      return (
        <select {...common} defaultValue={value as string} className="field">
          {Object.entries(f.options ?? {}).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      );
    case "therapist":
      return (
        <select {...common} defaultValue={value as string} className="field">
          <option value="">選択してください</option>
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      );
    case "therapists":
      return (
        <div className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-line bg-white p-3 sm:grid-cols-3">
          {therapists.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={f.name} value={t.id} defaultChecked={(value as string[]).includes(t.id)} className="accent-ink" />
              {t.name}
            </label>
          ))}
        </div>
      );
    case "image":
      return <ImageInput name={f.name} current={(value as string) || null} error={error} />;
    default:
      return (
        <input
          type="text"
          inputMode={f.type === "url" ? "url" : undefined}
          {...common}
          defaultValue={value as string}
          maxLength={f.maxLength}
          placeholder={f.placeholder}
          className="field"
        />
      );
  }
}

export function ResourceForm({ fields, values, therapists, action, cancelHref, hidden = [] }: Props) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const errors = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-xl border border-line bg-white p-4 sm:p-6">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        {fields
          .filter((f) => !hidden.includes(f.name))
          .map((f) => (
            <Field
              key={f.name}
              label={f.type === "boolean" ? " " : f.label}
              name={f.type === "boolean" || f.type === "therapists" || f.type === "image" ? undefined : f.name}
              required={f.required}
              error={f.type === "image" ? undefined : errors[f.name]}
              hint={f.type === "markup" ? <MarkupHint /> : f.help}
              className={cn(f.full && "sm:col-span-2")}
            >
              <Input f={f} value={values[f.name] ?? ""} error={errors[f.name]} therapists={therapists} />
            </Field>
          ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <SubmitButton pending={pending} />
        <Link href={cancelHref} className={b("secondary")}>
          キャンセル
        </Link>
      </div>
    </form>
  );
}
