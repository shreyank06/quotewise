"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

const LoginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("Enter your email and password.");

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : await verifyAgainstDummy(parsed.data.password);
  if (!user || !valid) return fail("Email or password is incorrect.");

  await createSession(user.id);
  redirect("/quotes");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
