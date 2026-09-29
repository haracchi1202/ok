import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomSlug } from "@/lib/format";
import { IMAGE_PRESETS, deleteImage, saveImage } from "@/lib/storage";
import { fromJstInput, isLinkUrl, SLUG_RE, str, bool, file, toJstInput, zodErrors } from "./form";
import type { FieldDef, ResourceDef } from "./resources";

// 汎用 CRUD のサーバー側処理 (Prisma デリゲートを動的に扱う)

export type Row = Record<string, unknown> & { id: string };

type Delegate = {
  findMany(args: unknown): Promise<Row[]>;
  findUnique(args: unknown): Promise<Row | null>;
  findFirst(args: unknown): Promise<Row | null>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<Row>;
  update(args: unknown): Promise<Row>;
  delete(args: unknown): Promise<Row>;
};

export function delegate(r: ResourceDef): Delegate {
  return (prisma as unknown as Record<string, Delegate>)[r.model];
}

export function relationInclude(r: ResourceDef) {
  const inc: Record<string, unknown> = {};
  for (const f of r.fields) {
    if (f.type === "therapist") inc.therapist = { select: { id: true, name: true } };
    if (f.type === "therapists") inc[f.name] = { select: { therapistId: true } };
  }
  return Object.keys(inc).length ? inc : undefined;
}

const REQUIRED = "必須項目です";

function fieldSchema(f: FieldDef): z.ZodType {
  switch (f.type) {
    case "boolean":
      return z.boolean();
    case "therapists":
      return z.array(z.string());
    case "number":
      return z
        .string()
        .refine((v) => v !== "" || !f.required, REQUIRED)
        .refine((v) => v === "" || /^-?\d+$/.test(v), "整数で入力してください")
        .transform((v) => (v === "" ? (f.nullable ? null : Number(f.defaultValue ?? 0)) : Number(v)))
        .refine((v) => v === null || f.min === undefined || v >= f.min, `${f.min} 以上で入力してください`)
        .refine((v) => v === null || f.max === undefined || v <= f.max, `${f.max} 以下で入力してください`);
    case "datetime":
      return z
        .string()
        .refine((v) => v !== "" || !f.required, REQUIRED)
        .refine((v) => v === "" || fromJstInput(v) !== null, "日時の形式が正しくありません")
        .transform((v) => (v === "" ? (f.nullable ? null : new Date()) : fromJstInput(v)));
    case "date":
      return z
        .string()
        .refine((v) => v !== "" || !f.required, REQUIRED)
        .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "日付の形式が正しくありません");
    case "select":
      return z.string().refine((v) => !!f.options && v in f.options, "選択肢から選んでください");
    case "therapist":
      return z.string().min(1, "セラピストを選択してください");
    case "slug":
      return z
        .string()
        .max(100, "100文字以内で入力してください")
        .refine((v) => v === "" || SLUG_RE.test(v), "半角英小文字・数字・ハイフンのみ使用できます");
    default: {
      const max = f.maxLength ?? (f.type === "text" || f.type === "url" ? 200 : 20000);
      let s = z.string().max(max, `${max}文字以内で入力してください`);
      if (f.required) s = s.min(1, REQUIRED);
      if (f.pattern) s = s.regex(new RegExp(f.pattern.re), f.pattern.message);
      const refined = f.type === "url" ? s.refine(isLinkUrl, "http(s):// から始まる URL か、/ から始まるパスを入力してください") : s;
      return refined.transform((v) => (v === "" && f.nullable ? null : v));
    }
  }
}

type ParseResult = { ok: true; data: Record<string, unknown>; relations: Record<string, string[]> } | { ok: false; errors: Record<string, string> };

/** FormData → Prisma data (画像は別処理) */
export async function parseResourceForm(r: ResourceDef, fd: FormData, id: string | null): Promise<ParseResult> {
  const fields = r.fields.filter((f) => f.type !== "image");
  const raw: Record<string, unknown> = {};
  const shape: Record<string, z.ZodType> = {};
  for (const f of fields) {
    raw[f.name] = f.type === "boolean" ? bool(fd, f.name) : f.type === "therapists" ? fd.getAll(f.name).map(String) : str(fd, f.name);
    shape[f.name] = fieldSchema(f);
  }
  const parsed = z.object(shape).safeParse(raw);
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const data: Record<string, unknown> = { ...parsed.data };
  const relations: Record<string, string[]> = {};
  const errors: Record<string, string> = {};
  const d = delegate(r);

  for (const f of fields) {
    if (f.type === "slug" && !data[f.name]) data[f.name] = randomSlug(f.slugPrefix ?? "");
    if ((f.type === "slug" || f.unique) && data[f.name]) {
      const dup = await d.findFirst({ where: { [f.name]: data[f.name], ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
      if (dup) errors[f.name] = "既に使用されています";
    }
    if (f.type === "therapist") {
      const t = await prisma.therapist.findUnique({ where: { id: data[f.name] as string }, select: { id: true } });
      if (!t) errors[f.name] = "セラピストが見つかりません";
    }
    if (f.type === "therapists") {
      const ids = data[f.name] as string[];
      const found = ids.length ? await prisma.therapist.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      relations[f.name] = found.map((t) => t.id);
      delete data[f.name];
    }
  }
  const extra = r.validate?.(data);
  if (extra) Object.assign(errors, extra);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data, relations };
}

/** 画像項目のアップロード / 削除。新規保存したファイルと、削除すべき旧ファイルを返す */
export async function processImages(r: ResourceDef, fd: FormData, current: Row | null, data: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const created: string[] = [];
  const obsolete: string[] = [];
  for (const f of r.fields.filter((x) => x.type === "image")) {
    const old = (current?.[f.name] as string | null) ?? null;
    const oldThumb = f.thumbField ? ((current?.[f.thumbField] as string | null) ?? null) : old?.replace(/\.webp$/, "_t.webp") ?? null;
    const upload = file(fd, `${f.name}__file`);
    if (upload) {
      try {
        const saved = await saveImage(upload, r.key, IMAGE_PRESETS[f.preset ?? "wide"]);
        data[f.name] = saved.path;
        if (f.thumbField) data[f.thumbField] = saved.thumbPath;
        created.push(saved.path, saved.thumbPath);
        if (old) obsolete.push(old, oldThumb ?? "");
      } catch (e) {
        errors[f.name] = e instanceof Error ? e.message : "画像を保存できませんでした";
      }
    } else if (bool(fd, `${f.name}__remove`) && old) {
      data[f.name] = null;
      if (f.thumbField) data[f.thumbField] = null;
      obsolete.push(old, oldThumb ?? "");
    }
  }
  return { errors, created, obsolete };
}

export async function deleteFiles(paths: (string | null | undefined)[]) {
  await Promise.all(paths.filter(Boolean).map((p) => deleteImage(p)));
}

/** 画像のパス一式 (削除用) */
export function imagePaths(r: ResourceDef, row: Row): string[] {
  const out: string[] = [];
  for (const f of r.fields.filter((x) => x.type === "image")) {
    const p = row[f.name] as string | null;
    if (!p) continue;
    out.push(p, f.thumbField ? ((row[f.thumbField] as string) ?? "") : p.replace(/\.webp$/, "_t.webp"));
  }
  return out;
}

export type FormValue = string | boolean | string[];

/** DB の行 → フォーム初期値 */
export function toFormValues(r: ResourceDef, row: Row | null): Record<string, FormValue> {
  const out: Record<string, FormValue> = {};
  for (const f of r.fields) {
    const v = row?.[f.name];
    if (f.type === "boolean") out[f.name] = row ? Boolean(v) : Boolean(f.defaultValue);
    else if (f.type === "therapists") out[f.name] = row ? ((v as { therapistId: string }[] | undefined) ?? []).map((x) => x.therapistId) : [];
    else if (f.type === "datetime") out[f.name] = v instanceof Date ? toJstInput(v) : "";
    else if (v === null || v === undefined) out[f.name] = row ? "" : f.defaultValue !== undefined ? String(f.defaultValue) : "";
    else out[f.name] = String(v);
  }
  return out;
}
