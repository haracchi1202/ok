"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/** カレンダーから任意の日付を選ぶ (ネイティブの日付ピッカーを使用) */
export function DatePicker({ value, min, max }: { value: string; min: string; max: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="relative flex h-16 min-w-[4.5rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-line bg-white text-sm hover:border-gold">
      <Icon name="calendar" className="h-5 w-5 text-gold-deep" />
      <span className="text-[11px]">カレンダー</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          if (e.target.value) p.set("date", e.target.value);
          router.push(`${pathname}?${p.toString()}`, { scroll: false });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="日付を選択"
      />
    </label>
  );
}
