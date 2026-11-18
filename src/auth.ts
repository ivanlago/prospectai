import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPool } from "@/db";

export function resetEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESET_FROM);
}

function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!baseURL || !secret || secret.length < 32) throw new Error("Configure BETTER_AUTH_URL e BETTER_AUTH_SECRET.");

  const trustedIpHeader = process.env.AUTH_IP_HEADER;
  return betterAuth({
    database: getPool(),
    baseURL,
    secret,
    user: { modelName: "users" },
    account: { modelName: "accounts" },
    session: { modelName: "sessions", expiresIn: 60 * 60 * 24, updateAge: 60 * 60 * 4 },
    verification: { modelName: "verifications" },
    rateLimit: { enabled: false },
    advanced: { database: { generateId: "uuid" }, ipAddress: { ipAddressHeaders: trustedIpHeader ? [trustedIpHeader] : [] } },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 14,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 900,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: resetEnabled() ? async ({ user, url }) => {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: process.env.RESET_FROM, to: user.email,
              subject: "Recuperação de acesso ao ProspectAI", text: `Redefina sua senha em até 15 minutos: ${url}` }),
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) throw new Error("Falha no envio");
        } catch {
          console.error({ event: "auth.reset_email_failed" });
        }
      } : undefined,
    },
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => auth ??= createAuth();

export const requireAdmin = cache(async () => {
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")) redirect("/entrar");
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/entrar");
  return session.user;
});
