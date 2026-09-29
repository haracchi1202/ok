import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => cmsMetadata("terms", "/terms");

export default function Page() {
  return (
    <>
      <CmsPage slug="terms" en="TERMS"></CmsPage>
      
    </>
  );
}
