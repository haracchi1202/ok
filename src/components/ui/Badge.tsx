import { cn } from "@/lib/cn";

const tones = {
  new: "bg-rose text-white",
  rank: "bg-gold text-white",
  today: "bg-ink text-ivory",
  now: "bg-ok text-white",
  soft: "bg-white/90 text-ink",
  muted: "bg-ng-soft text-ng",
  outline: "border border-line bg-white text-ink-soft",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  danger: "bg-danger/10 text-danger",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "soft", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-5 font-medium tracking-wider whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
