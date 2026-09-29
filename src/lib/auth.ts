import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "./db";
import type { Role } from "./constants";

export const SESSION_COOKIE = "lueur_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  therapistId: string | null;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await verifySessionToken(token);
  if (!id) return null;
  const u = await prisma.adminUser.findUnique({ where: { id } });
  if (!u || !u.isActive) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as Role, therapistId: u.therapistId };
});

/** ページ用: 未ログインならログイン画面へ、権限不足なら 403 相当の画面へ */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (roles && !roles.includes(user.role)) redirect("/admin?denied=1");
  return user;
}

/** Server Action 用: 例外で中断する */
export async function assertUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (roles && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export const STAFF_ROLES: Role[] = ["ADMIN", "STAFF"];
export const ADMIN_ONLY: Role[] = ["ADMIN"];

/** セラピストは自分のデータのみ操作可能 */
export function canEditTherapist(user: SessionUser, therapistId: string): boolean {
  return user.role === "ADMIN" || user.role === "STAFF" || user.therapistId === therapistId;
}
