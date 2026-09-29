import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings, siteUrl } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${s.site_name}｜${s.site_tagline}`, template: `%s｜${s.site_name}` },
    description: s.site_description,
    openGraph: { siteName: s.site_name, type: "website", locale: "ja_JP", images: s.og_image ? [s.og_image] : undefined },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#17131b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
