export function PageHero({ en, title, lead, children }: { en?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="container-page pt-6 pb-2 sm:pt-10">
      {en && <p className="font-display text-[11px] tracking-[0.4em] text-gold uppercase">{en}</p>}
      <h1 className="text-2xl sm:text-3xl">{title}</h1>
      {lead && <p className="mt-2 max-w-2xl text-sm text-muted sm:text-[15px]">{lead}</p>}
      {children}
    </div>
  );
}
