import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState title="お探しのページが見つかりません" description="URL が変更されたか、公開が終了した可能性があります。" actionHref="/" actionLabel="トップへ戻る" />
    </div>
  );
}
