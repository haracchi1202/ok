import type { ZodError } from "zod";
import { toJstDateString, toJstTime } from "@/lib/time";

// 管理画面フォーム共通の型とヘルパー (クライアント / サーバー両方から利用)

export type FormState = {
  ok?: boolean;
  message?: string; // 成功メッセージ
  error?: string; // フォーム全体のエラー
  errors?: Record<string, string>; // 項目ごとのエラー
  warnings?: string[];
};

export const initialFormState: FormState = {};

export function zodErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(fd: FormData, name: string): boolean {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function file(fd: FormData, name: string): File | null {
  const v = fd.get(name);
  return v && typeof v === "object" && "size" in v && v.size > 0 ? (v as File) : null;
}

/** Date → datetime-local 用の JST 文字列 "YYYY-MM-DDTHH:MM" */
export function toJstInput(d: Date | null | undefined): string {
  if (!d) return "";
  return `${toJstDateString(d)}T${toJstTime(d)}`;
}

/** datetime-local の値 (JST) → Date。不正なら null */
export function fromJstInput(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${s}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const SLUG_RE = /^[a-z0-9-]+$/;

export function isHttpUrl(s: string): boolean {
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** リンク先: 空 / サイト内パス / http(s) */
export function isLinkUrl(s: string): boolean {
  return !s || (s.startsWith("/") && !s.startsWith("//")) || isHttpUrl(s);
}

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function sp(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export const PAGE_SIZE = 20;
