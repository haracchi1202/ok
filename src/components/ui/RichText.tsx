import Link from "next/link";
import { Fragment } from "react";

// CMS 本文用の軽量マークアップ (見出し ##, 箇条書き -, 番号付き 1., **太字**, [リンク](url))。
// HTML は一切解釈せず React 要素として組み立てるため XSS の心配がない。

function safeHref(url: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^https?:\/\//.test(url) || /^(tel|mailto):/.test(url)) return url;
  return null;
}

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else {
      const href = safeHref(m[3]);
      if (!href) out.push(m[2]);
      else if (href.startsWith("/"))
        out.push(
          <Link key={`${keyBase}-${i++}`} href={href}>
            {m[2]}
          </Link>,
        );
      else
        out.push(
          <a key={`${keyBase}-${i++}`} href={href} target="_blank" rel="noopener noreferrer">
            {m[2]}
          </a>,
        );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className = "prose-lite" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-・]\s+/.test(l)))
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-・]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+\.\s+/.test(l)))
          return (
            <ol key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*\d+\.\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        return (
          <Fragment key={bi}>
            {lines.map((l, li) => {
              if (l.startsWith("### ")) return <h3 key={li}>{inline(l.slice(4), `${bi}-${li}`)}</h3>;
              if (l.startsWith("## ")) return <h2 key={li}>{inline(l.slice(3), `${bi}-${li}`)}</h2>;
              return null;
            })}
            {lines.some((l) => !/^#{2,3} /.test(l)) && (
              <p>
                {lines
                  .filter((l) => !/^#{2,3} /.test(l))
                  .map((l, li, arr) => (
                    <Fragment key={li}>
                      {inline(l, `${bi}-${li}`)}
                      {li < arr.length - 1 && <br />}
                    </Fragment>
                  ))}
              </p>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
