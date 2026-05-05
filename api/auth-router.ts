import { appendClearSessionCookie } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import { findUserByLogin } from "./queries/users";
import { hashPassword, verifyPassword } from "./lib/password";
import { signSessionToken } from "./lib/session";
import { appendSessionCookie } from "./lib/cookies";
import { env } from "./lib/env";
import { eq } from "drizzle-orm";

const authAttempts = new Map<string, { count: number; resetAt: number }>();
let lastAuthAttemptCleanupAt = 0;

export const authRouter = createRouter({
  me: publicQuery.query((opts) => opts.ctx.user ?? null),
  register: publicQuery
    .input(
      z.object({
        username: z.string().min(3).max(100),
        name: z.string().min(1).max(255),
        email: z.string().email(),
        password: z.string().min(8).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      guardAuthAttempt(ctx.req, input.username);
      const username = input.username.trim().toLowerCase();
      const email = input.email.trim().toLowerCase();
      const existing = await findUserByLogin(username) || await findUserByLogin(email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username atau email sudah digunakan",
        });
      }

      const inserted = await getDb()
        .insert(users)
        .values({
          unionId: `local:${username}`,
          username,
          name: input.name.trim(),
          email,
          passwordHash: hashPassword(input.password),
          authProvider: "local",
          role: username === env.ownerUnionId || email === env.ownerUnionId ? "admin" : "user",
          lastSignInAt: new Date(),
        })
        .returning();

      const user = inserted[0];
      const token = await signSessionToken({
        unionId: user.unionId,
        clientId: "local",
      });
      appendSessionCookie(ctx.resHeaders, ctx.req.headers, token);
      return { success: true, user };
    }),
  login: publicQuery
    .input(
      z.object({
        login: z.string().min(1).max(320),
        password: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      guardAuthAttempt(ctx.req, input.login);
      const user = await findUserByLogin(input.login);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Username/email atau password salah",
        });
      }

      await getDb()
        .update(users)
        .set({ lastSignInAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      const token = await signSessionToken({
        unionId: user.unionId,
        clientId: "local",
      });
      appendSessionCookie(ctx.resHeaders, ctx.req.headers, token);
      return { success: true, user };
    }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    appendClearSessionCookie(ctx.resHeaders, ctx.req.headers);
    return { success: true };
  }),
});

function guardAuthAttempt(request: Request, login: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("cf-connecting-ip") || "local";
  const key = `${ip}:${login.trim().toLowerCase()}`;
  const now = Date.now();
  cleanupAuthAttempts(now);
  const current = authAttempts.get(key);

  if (!current || current.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }

  current.count += 1;
  if (current.count > 10) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.",
    });
  }
}

function cleanupAuthAttempts(now: number) {
  if (now - lastAuthAttemptCleanupAt < 60_000) return;
  lastAuthAttemptCleanupAt = now;
  for (const [key, attempt] of authAttempts) {
    if (attempt.resetAt <= now) authAttempts.delete(key);
  }
}
