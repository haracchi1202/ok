import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";
import { ReserveBand } from "@/components/site/ReserveBand";
import { CTAButton } from "@/components/ui/CTAButton";
export const dynamic = "force-dynamic";
export const generateMetadata = () => cmsMetadata("guide", "/guide");

export default function Page() {
  return (
    <>
      <CmsPage slug="guide" en="FOR BEGINNERS">
        <div className="mt-6 flex flex-wrap gap-2">
          <CTAButton href="/therapists" variant="primary" icon="search">セラピストを探す</CTAButton>
          <CTAButton href="/price/simulator" variant="outline" icon="yen">料金を計算する</CTAButton>
          <CTAButton href="/faq" variant="ghost" className="border border-line">よくある質問</CTAButton>
        </div>
      </CmsPage>
      <ReserveBand />
    </>
  );
}
