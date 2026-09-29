import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <p className="font-display text-2xl tracking-[0.2em] text-ink">LUEUR</p>
        <h1 className="mt-1 mb-6 text-sm text-muted">管理画面ログイン</h1>
        <LoginForm />
      </div>
    </main>
  );
}
