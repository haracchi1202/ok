import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { siteUrl } from "@/lib/settings";

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "ホーム", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="パンくずリスト" className="container-page pt-4 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {c.href && i < all.length - 1 ? (
                <Link href={c.href} className="hover:text-gold-deep">
                  {c.name}
                </Link>
              ) : (
                <span aria-current={i === all.length - 1 ? "page" : undefined} className="text-ink-soft">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: `${siteUrl}${c.href}` } : {}),
          })),
        }}
      />
    </>
  );
}
