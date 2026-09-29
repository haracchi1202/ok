"use client";

import { startTransition, useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/admin/form";
import { b } from "./ui";

// 管理画面の共通クライアント部品

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/**
 * useActionState ラッパー。form の自動リセットを避けるため onSubmit から dispatch する
 * (バリデーションエラー時に入力内容が消えないように)。
 */
export function useAdminForm(action: Action) {
  const [state, dispatch, pending] = useActionState(action, {} as FormState);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.errors && Object.keys(state.errors).length > 0)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        入力内容をご確認ください。
      </p>
    );
  return (
    <>
      {state.message && (
        <p role="status" className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok">
          {state.message}
        </p>
      )}
      {state.warnings?.map((w) => (
        <p key={w} className="mt-1 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
          {w}
        </p>
      ))}
    </>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">
        {label}
        {required && <span className="ml-1 text-xs text-danger">*</span>}
      </label>
      {children}
      {typeof hint === "string" ? <p className="mt-1 text-xs text-muted">{hint}</p> : hint}
      {error && (
        <p className="mt-1 text-xs text-danger" id={name ? `${name}-error` : undefined}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ pending, children = "保存する", className, name, value }: { pending: boolean; children?: React.ReactNode; className?: string; name?: string; value?: string }) {
  return (
    <button type="submit" disabled={pending} className={b("primary", className)} name={name} value={value}>
      {pending ? "処理中…" : children}
    </button>
  );
}

/** 確認ダイアログ付きのボタンフォーム (削除など) */
export function ConfirmForm({
  action,
  confirmText = "削除してよろしいですか？この操作は取り消せません。",
  children,
  className,
  hidden,
}: {
  action: (fd: FormData) => void | Promise<void>;
  confirmText?: string;
  children: React.ReactNode;
  className?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      className={cn("inline", className)}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );
}

/** 画像入力: 現在画像のプレビュー + 差し替え + 削除 */
export function ImageInput({ name, current, error }: { name: string; current?: string | null; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const shown = preview ?? (remove ? null : current);
  return (
    <div>
      {shown && <img src={shown} alt="" className="mb-2 max-h-40 rounded-lg border border-line object-contain" />}
      <input
        type="file"
        id={name}
        name={`${name}__file`}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
      {current && (
        <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name={`${name}__remove`} checked={remove} onChange={(e) => setRemove(e.target.checked)} />
          現在の画像を削除する
        </label>
      )}
      <p className="mt-1 text-xs text-muted">JPEG / PNG / WebP / AVIF、8MB まで。自動でリサイズ・WebP 変換されます。</p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** 変更時に即送信する select (一覧のステータス変更など) */
export function AutoSubmitSelect({
  action,
  name,
  value,
  options,
  hidden,
  className,
}: {
  action: (fd: FormData) => void | Promise<void>;
  name: string;
  value: string;
  options: Record<string, string>;
  hidden?: Record<string, string>;
  className?: string;
}) {
  return (
    <form action={action}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select
        name={name}
        defaultValue={value}
        aria-label="ステータス変更"
        className={cn("h-8 rounded-lg border border-line bg-white px-2 text-xs", className)}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </form>
  );
}
