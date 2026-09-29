"use client";
import { useEffect, useState } from "react";

const KEY = "lueur:age-ok";

/** 管理画面の設定で有効化できる年齢確認ゲート */
export function AgeGate({ message, siteName }: { message: string; siteName: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setShow(true);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night/95 p-6 text-ivory" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-3xl tracking-[0.35em] text-gold-soft">{siteName}</p>
        <p id="age-gate-title" className="mt-6 text-sm leading-relaxed whitespace-pre-line">{message}</p>
        <div className="mt-8 grid gap-3">
          <button
            className="h-12 rounded-full bg-gold text-white"
            onClick={() => {
              try {
                localStorage.setItem(KEY, "1");
              } catch {}
              setShow(false);
            }}
          >
            はい（入場する）
          </button>
          <a href="https://www.google.com/" className="flex h-12 items-center justify-center rounded-full border border-white/30 text-sm">
            いいえ（退場する）
          </a>
        </div>
      </div>
    </div>
  );
}
