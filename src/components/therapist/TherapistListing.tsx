import { Suspense } from "react";
import { parseSearchParams, searchTherapists, getActiveTags, type SearchParams } from "@/lib/therapists";
import { SearchFilter } from "./SearchFilter";
import { TherapistGrid } from "./TherapistGrid";
import { Pagination } from "@/components/ui/Pagination";

type Raw = Record<string, string | string[] | undefined>;

/** /therapists /newcomers /today で共通利用する検索付き一覧 */
export async function TherapistListing({ raw, basePath, preset = {}, hideKeys }: { raw: Raw; basePath: string; preset?: Partial<SearchParams>; hideKeys?: string[] }) {
  const { sort: presetSort, ...fixed } = preset;
  const params = { ...parseSearchParams(raw), ...fixed };
  if (!raw.sort && presetSort) params.sort = presetSort;
  const [result, tags] = await Promise.all([searchTherapists(params), getActiveTags()]);
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v.join(",") : v;
  return (
    <>
      <Suspense>
        <SearchFilter tags={tags.map((t) => ({ name: t.name, slug: t.slug, group: t.group }))} total={result.total} hideKeys={hideKeys} />
      </Suspense>
      <div className="mt-6">
        <TherapistGrid items={result.items} />
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} basePath={basePath} params={flat} />
    </>
  );
}
