"use client";

import type { FormState } from "@/lib/admin/form";
import { Icon } from "@/components/ui/Icon";
import { ConfirmForm, FormMessage, SubmitButton, useAdminForm } from "./client";
import { b, Pill } from "./ui";

type Photo = { id: string; thumbPath: string; alt: string; sortOrder: number };

type Props = {
  photos: Photo[];
  upload: (s: FormState, fd: FormData) => Promise<FormState>;
  act: (imageId: string, fd: FormData) => Promise<void>;
};

function OpButton({ act, id, op, label, icon, disabled }: { act: Props["act"]; id: string; op: string; label: string; icon?: "arrowUp" | "arrowDown" | "star"; disabled?: boolean }) {
  return (
    <form action={act.bind(null, id)}>
      <input type="hidden" name="op" value={op} />
      <button type="submit" disabled={disabled} className={b("sm", "px-2")} title={label}>
        {icon ? <Icon name={icon} className="h-3.5 w-3.5" /> : null}
        <span className={icon ? "sr-only" : undefined}>{label}</span>
      </button>
    </form>
  );
}

export function PhotoManager({ photos, upload, act }: Props) {
  const { state, onSubmit, pending } = useAdminForm(upload);
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-sm font-semibold">写真</h2>
      <p className="mb-4 text-xs text-muted">1 枚目がメイン写真になります。縦長 (3:4) に自動トリミングされます。</p>
      <form onSubmit={onSubmit} className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="photos"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label="アップロードする写真"
          className="block text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm"
        />
        <SubmitButton pending={pending}>アップロード</SubmitButton>
        <div className="w-full">
          <FormMessage state={state} />
        </div>
      </form>

      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">写真がまだありません。</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="rounded-lg border border-line p-2">
              <div className="relative">
                <img src={p.thumbPath} alt={p.alt} className="aspect-[3/4] w-full rounded object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5">
                    <Pill tone="ink">メイン</Pill>
                  </span>
                )}
              </div>
              <form action={act.bind(null, p.id)} className="mt-2 flex gap-1">
                <input type="hidden" name="op" value="alt" />
                <input name="alt" defaultValue={p.alt} aria-label="代替テキスト" placeholder="代替テキスト" className="h-8 min-w-0 flex-1 rounded-lg border border-line px-2 text-xs" />
                <button type="submit" className={b("sm", "px-2")}>
                  保存
                </button>
              </form>
              <div className="mt-2 flex flex-wrap gap-1">
                <OpButton act={act} id={p.id} op="up" label="前へ" icon="arrowUp" disabled={i === 0} />
                <OpButton act={act} id={p.id} op="down" label="後ろへ" icon="arrowDown" disabled={i === photos.length - 1} />
                {i !== 0 && <OpButton act={act} id={p.id} op="main" label="メインにする" />}
                <ConfirmForm action={act.bind(null, p.id)} hidden={{ op: "delete" }} confirmText="この写真を削除しますか？">
                  <button type="submit" className={b("smDanger", "px-2")}>
                    削除
                  </button>
                </ConfirmForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
