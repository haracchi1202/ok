"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { KANA_ROWS, SORT_OPTIONS, TAG_GROUPS, type TagGroup } from "@/lib/constants";

type TagOpt = { name: string; slug: string; group: string };

const QUICK = [
  { key: "today", label: "本日出勤" },
  { key: "now", label: "今すぐ予約可" },
  { key: "newcomer", label: "新人" },
  { key: "overnight", label: "宿泊対応" },
] as const;

const AGE_OPTS = [20, 23, 25, 28, 30, 33, 35, 40];
const HEIGHT_OPTS = [165, 170, 173, 175, 178, 180, 183, 185];

/**
 * セラピスト検索フィルター。条件はすべて URL クエリに保存するため、
 * ブラウザバック・リロード・URL 共有でも検索状態が保たれる。
 */
export function SearchFilter({ tags, total, hideKeys = [] }: { tags: TagOpt[]; total: number; hideKeys?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const get = (k: string) => sp.get(k) ?? "";
  const [q, setQ] = useState(get("q"));
  const [draft, setDraft] = useState(() => readDraft(sp));
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setDraft(readDraft(sp));
  }, [sp]);

  const push = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    const qs = p.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const toggleQuick = (key: string) => push((p) => (p.get(key) === "1" ? p.delete(key) : p.set(key, "1")));
  const selectedTags = get("tags").split(",").filter(Boolean);

  const applyDraft = () => {
    push((p) => {
      for (const k of ["initial", "ageMin", "ageMax", "heightMin", "heightMax"] as const) {
        if (draft[k]) p.set(k, draft[k]);
        else p.delete(k);
      }
      if (draft.tags.length) p.set("tags", draft.tags.join(","));
      else p.delete("tags");
    });
    setOpen(false);
  };

  const activeCount = ["initial", "ageMin", "ageMax", "heightMin", "heightMax"].filter((k) => get(k)).length + selectedTags.length;
  const tagByGroup = (Object.keys(TAG_GROUPS) as TagGroup[]).map((g) => ({ g, items: tags.filter((t) => t.group === g) })).filter((x) => x.items.length);

  const chips: { label: string; remove: () => void }[] = [];
  if (get("q")) chips.push({ label: `「${get("q")}」`, remove: () => push((p) => p.delete("q")) });
  if (get("initial")) chips.push({ label: `${get("initial")}行`, remove: () => push((p) => p.delete("initial")) });
  if (get("ageMin") || get("ageMax")) chips.push({ label: `年齢 ${get("ageMin") || ""}〜${get("ageMax") || ""}`, remove: () => push((p) => (p.delete("ageMin"), p.delete("ageMax"))) });
  if (get("heightMin") || get("heightMax"))
    chips.push({ label: `身長 ${get("heightMin") || ""}〜${get("heightMax") || ""}cm`, remove: () => push((p) => (p.delete("heightMin"), p.delete("heightMax"))) });
  for (const s of selectedTags) {
    const t = tags.find((x) => x.slug === s);
    chips.push({
      label: `#${t?.name ?? s}`,
      remove: () =>
        push((p) => {
          const rest = selectedTags.filter((x) => x !== s);
          if (rest.length) p.set("tags", rest.join(","));
          else p.delete("tags");
        }),
    });
  }

  return (
    <div className="space-y-3" aria-busy={pending}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          push((p) => (q.trim() ? p.set("q", q.trim()) : p.delete("q")));
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1">
          <span className="sr-only">フリーワード検索</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・特徴・キーワード"
            maxLength={50}
            className="field h-12 rounded-full pl-11"
            enterKeyHint="search"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className={cn("relative flex h-12 items-center gap-1.5 rounded-full border px-4 text-sm", open ? "border-ink bg-ink text-ivory" : "border-line bg-white")}
        >
          <Icon name="filter" className="h-4 w-4" />
          <span className="hidden sm:inline">絞り込み</span>
          {activeCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] text-white">{activeCount}</span>}
        </button>
      </form>

      <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK.filter((x) => !hideKeys.includes(x.key)).map((x) => {
          const on = get(x.key) === "1";
          return (
            <button key={x.key} type="button" onClick={() => toggleQuick(x.key)} aria-pressed={on} className={cn("chip h-9 shrink-0 px-4 text-[13px]", on && "chip-active")}>
              {on && <Icon name="check" className="h-3.5 w-3.5" />}
              {x.label}
            </button>
          );
        })}
      </div>

      {open && (
        <div id="filter-panel" className="card space-y-6 p-5">
          <fieldset>
            <legend className="field-label">名前の頭文字</legend>
            <div className="flex flex-wrap gap-1.5">
              {KANA_ROWS.map((r) => (
                <button key={r} type="button" onClick={() => setDraft((d) => ({ ...d, initial: d.initial === r ? "" : r }))} aria-pressed={draft.initial === r} className={cn("chip h-9 w-9 justify-center p-0 text-sm", draft.initial === r && "chip-active")}>
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <RangeSelect label="年齢" unit="歳" opts={AGE_OPTS} min={draft.ageMin} max={draft.ageMax} onChange={(ageMin, ageMax) => setDraft((d) => ({ ...d, ageMin, ageMax }))} />
            <RangeSelect label="身長" unit="cm" opts={HEIGHT_OPTS} min={draft.heightMin} max={draft.heightMax} onChange={(heightMin, heightMax) => setDraft((d) => ({ ...d, heightMin, heightMax }))} />
          </div>
          {tagByGroup.map(({ g, items }) => (
            <fieldset key={g}>
              <legend className="field-label">
                {TAG_GROUPS[g]} <span className="text-xs font-normal text-muted">（複数選択はすべてに該当する人を表示）</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {items.map((t) => {
                  const on = draft.tags.includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft((d) => ({ ...d, tags: on ? d.tags.filter((x) => x !== t.slug) : [...d.tags, t.slug] }))}
                      className={cn("chip h-9 px-3.5 text-[13px]", on && "chip-active")}
                    >
                      #{t.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => setDraft({ initial: "", ageMin: "", ageMax: "", heightMin: "", heightMax: "", tags: [] })} className="h-12 rounded-full px-5 text-sm text-muted hover:text-ink">
              クリア
            </button>
            <button type="button" onClick={applyDraft} className="h-12 flex-1 rounded-full bg-ink text-sm tracking-wider text-ivory">
              この条件で検索する
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" aria-live="polite">
          <span className="font-display text-2xl text-ink">{total}</span>
          <span className="ml-1 text-muted">名</span>
          {pending && <span className="ml-2 text-xs text-muted">検索中…</span>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <Icon name="sort" className="h-4 w-4 text-muted" />
          <span className="sr-only">並び替え</span>
          <select value={get("sort") || "recommend"} onChange={(e) => push((p) => (e.target.value === "recommend" ? p.delete("sort") : p.set("sort", e.target.value)))} className="field h-10 w-auto rounded-full py-0 pr-8 text-sm">
            {Object.entries(SORT_OPTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="適用中の条件">
          {chips.map((c) => (
            <li key={c.label}>
              <button type="button" onClick={c.remove} className="chip border-gold-soft bg-gold/5 text-gold-deep">
                {c.label}
                <Icon name="close" className="h-3 w-3" />
                <span className="sr-only">条件を外す</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => startTransition(() => router.push(pathname, { scroll: false }))} className="px-2 text-xs text-muted underline">
              すべてクリア
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function readDraft(sp: URLSearchParams | ReturnType<typeof useSearchParams>) {
  return {
    initial: sp.get("initial") ?? "",
    ageMin: sp.get("ageMin") ?? "",
    ageMax: sp.get("ageMax") ?? "",
    heightMin: sp.get("heightMin") ?? "",
    heightMax: sp.get("heightMax") ?? "",
    tags: (sp.get("tags") ?? "").split(",").filter(Boolean),
  };
}

function RangeSelect({ label, unit, opts, min, max, onChange }: { label: string; unit: string; opts: number[]; min: string; max: string; onChange: (min: string, max: string) => void }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex items-center gap-2">
        <select aria-label={`${label}（下限）`} value={min} onChange={(e) => onChange(e.target.value, max)} className="field">
          <option value="">下限なし</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
              {unit}
            </option>
          ))}
        </select>
        <span className="text-muted">〜</span>
        <select aria-label={`${label}（上限）`} value={max} onChange={(e) => onChange(min, e.target.value)} className="field">
          <option value="">上限なし</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
              {unit}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
