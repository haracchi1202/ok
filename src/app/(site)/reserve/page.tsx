import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getPriceMaster } from "@/lib/content";
import { parseSimParams } from "@/lib/sim-params";
import { issueFormToken } from "@/lib/form-guard";
import { getSettings } from "@/lib/settings";
import { addDays, isValidDateString, timeOptions, todayBusinessDate } from "@/lib/time";
import { PageHero } from "@/components/ui/PageHero";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { CTAButton } from "@/components/ui/CTAButton";

export const metadata: Metadata = {
  title: "予約フォーム",
  description: "ご希望の日時・セラピスト・コースを選んでご予約ください。",
  alternates: { canonical: "/reserve" },
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function ReservePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, master, settings] = await Promise.all([searchParams, getPriceMaster(), getSettings()]);
  const therapists = await prisma.therapist.findMany({
    where: { status: "ACTIVE" },
    orderBy: { recommendOrder: "asc" },
    select: { slug: true, name: true, canOvernight: true },
  });
  const sim = parseSimParams(raw, master);
  const today = todayBusinessDate();
  const dates = Array.from({ length: 31 }, (_, i) => addDays(today, i));
  const date = typeof raw.date === "string" && isValidDateString(raw.date) && dates.includes(raw.date) ? raw.date : "";
  const second = typeof raw.second === "string" && therapists.some((t) => t.slug === raw.second) ? raw.second : "";
  return (
    <>
      <Breadcrumbs items={[{ name: "予約フォーム" }]} />
      <PageHero en="RESERVATION" title="ご予約" lead="必要事項をご入力ください。お電話・公式メッセージでのご予約も承っています。">
        <div className="mt-4 flex flex-wrap gap-2">
          <CTAButton href={settings.line_url} variant="line" size="sm" icon="chat">{settings.line_label}</CTAButton>
          <CTAButton href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} variant="outline" size="sm" icon="phone">{settings.phone}</CTAButton>
          {settings.external_reserve_url && <CTAButton href={settings.external_reserve_url} variant="ghost" size="sm" icon="external" className="border border-line">外部予約サイト</CTAButton>}
        </div>
      </PageHero>
      <div className="container-page mt-8 pb-10">
        <ReservationForm
          master={master}
          therapists={therapists}
          initial={{ ...sim, secondTherapist: second, date }}
          dates={dates}
          times={timeOptions(10, 28, 30)}
          formToken={issueFormToken()}
          notice={settings.reservation_notice}
        />
      </div>
    </>
  );
}
