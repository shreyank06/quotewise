import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db/client";
import { companies, sessions, users } from "../db/schema";

export const SESSION_COOKIE = "qw_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/**
 * The tenant context for this request. Every data access goes through a companyId that came
 * from here, never from a form field or URL, so one company can't ask for another's data.
 */
export type TenantContext = {
  userId: string;
  userName: string;
  companyId: string;
  companyName: string;
};

// Memoised per request so layouts and pages share one lookup.
export const getTenant = cache(async (): Promise<TenantContext | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ userId: users.id, userName: users.name, companyId: companies.id, companyName: companies.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

export async function requireTenant(): Promise<TenantContext> {
  const tenant = await getTenant();
  if (!tenant) redirect("/login");
  return tenant;
}
