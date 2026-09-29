import type { Metadata } from "next";
import { requireUser, STAFF_ROLES } from "@/lib/auth";
import { getSettings, SETTING_DEFS, type SettingKey } from "@/lib/settings";
import { saveSettings } from "@/lib/admin/misc-actions";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "サイト設定" };

export default async function SettingsPage() {
  await requireUser(STAFF_ROLES);
  const s = await getSettings();
  const defs = (Object.keys(SETTING_DEFS) as SettingKey[]).map((k) => {
    const d = SETTING_DEFS[k];
    return { key: k, label: d.label, group: d.group, multiline: "multiline" in d && d.multiline, value: s[k], default: d.default };
  });
  return (
    <>
      <PageHeader title="サイト設定" description="店舗情報・外部導線・予約の設定などをコードを変更せずに編集できます。" />
      <SettingsForm defs={defs} action={saveSettings} />
    </>
  );
}
