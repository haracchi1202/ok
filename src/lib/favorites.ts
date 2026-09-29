"use client";
import { useSyncExternalStore } from "react";

// お気に入りはログイン不要でブラウザ (localStorage) に保存する。
// 将来会員機能を追加する際は FavoritesBackend を API 実装に差し替え、
// ログイン時に localStorage の内容をサーバーへマージする想定。
export interface FavoritesBackend {
  load(): string[];
  save(ids: string[]): void;
}

const KEY = "lueur:favorites:v1";

const localBackend: FavoritesBackend = {
  load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 200) : [];
    } catch {
      return [];
    }
  },
  save(ids) {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* private mode 等では保存しない */
    }
  },
};

let backend: FavoritesBackend = localBackend;
let cache: string[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

function read(): string[] {
  if (cache === null) cache = backend.load();
  return cache;
}
function emit() {
  listeners.forEach((l) => l());
}

export function setFavoritesBackend(b: FavoritesBackend) {
  backend = b;
  cache = null;
  emit();
}

export function toggleFavorite(slug: string) {
  const cur = read();
  cache = cur.includes(slug) ? cur.filter((x) => x !== slug) : [slug, ...cur];
  backend.save(cache);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
