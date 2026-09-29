"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

type Img = { path: string; thumbPath: string; alt: string; width: number; height: number };

/** スワイプ対応の写真ギャラリー (スクロールスナップ + サムネイル) */
export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  if (!images.length)
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-3xl bg-ink-soft text-ivory/40">
        <Icon name="user" className="h-16 w-16" />
      </div>
    );
  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-none [scrollbar-width:none] sm:rounded-3xl [&::-webkit-scrollbar]:hidden"
          aria-roledescription="カルーセル"
          aria-label={`${name}の写真`}
        >
          {images.map((img, i) => (
            <img
              key={img.path}
              src={img.path}
              alt={img.alt || `${name}の写真 ${i + 1}`}
              width={img.width}
              height={img.height}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              className="aspect-[3/4] w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="前の写真" className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink disabled:opacity-0 sm:flex">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === images.length - 1} aria-label="次の写真" className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink disabled:opacity-0 sm:flex">
              <Icon name="chevronRight" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
              {images.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-white" : "w-1.5 bg-white/50")} />
              ))}
            </div>
            <span className="absolute top-3 right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 hidden grid-cols-5 gap-2 sm:grid">
          {images.map((img, i) => (
            <button key={img.thumbPath} type="button" onClick={() => go(i)} aria-label={`写真${i + 1}を表示`} className={cn("overflow-hidden rounded-xl ring-2 transition", i === index ? "ring-gold" : "ring-transparent opacity-70 hover:opacity-100")}>
              <img src={img.thumbPath} alt="" width={120} height={160} loading="lazy" className="aspect-[3/4] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
