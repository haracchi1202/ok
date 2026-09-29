import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => cmsMetadata("privacy", "/privacy");

export default function Page() {
  return (
    <>
      <CmsPage slug="privacy" en="PRIVACY"></CmsPage>
      
    </>
  );
}
