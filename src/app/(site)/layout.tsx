import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { AgeGate } from "@/components/site/AgeGate";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSettings, siteUrl } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        本文へスキップ
      </a>
      <Header settings={settings} />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer settings={settings} />
      <MobileBottomNav />
      {settings.age_gate_enabled === "1" && <AgeGate message={settings.age_gate_message} siteName={settings.site_name} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.site_name,
          url: siteUrl,
          telephone: settings.phone,
          sameAs: [settings.sns_x, settings.sns_instagram, settings.sns_tiktok].filter(Boolean),
        }}
      />
    </>
  );
}
