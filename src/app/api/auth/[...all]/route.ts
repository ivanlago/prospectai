import { getAuth, resetEnabled } from "@/auth";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { sql } from "drizzle-orm";
import { loginForm } from "@/domain";

const limited = new Set(["sign-in/email", "request-password-reset", "reset-password"]);

export async function GET(request: Request, { params }: { params: Promise<{ all: string[] }> }) {
  const [route, token, ...rest] = (await params).all;
  if (route === "reset-password" && token && !rest.length && resetEnabled()) return getAuth().handler(request);
  return new Response(null, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ all: string[] }> }) {
  const route = (await params).all.join("/");
  if (!limited.has(route) || (route !== "sign-in/email" && !resetEnabled())) {
    return Response.json({ message: "Operação indisponível." }, { status: 403 });
  }

  {
    const now = Math.floor(Date.now() / 60000);
    const configuredHeader = process.env.AUTH_IP_HEADER;
    const ip = configuredHeader ? request.headers.get(configuredHeader)?.slice(0, 128) : null;
    const key = `${route}:${ip || "-"}`;
    const [attempt] = await getDb().insert(rateLimits).values({ key, count: 1, window: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: sql`case when ${rateLimits.window} >= ${now} then least(${rateLimits.count} + 1, 6) else 1 end`, window: sql`greatest(${rateLimits.window}, ${now})` },
      }).returning({ count: rateLimits.count });
    if (attempt.count > 5) {
      return Response.json({ message: "Aguarde um minuto e tente novamente." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    if (route === "sign-in/email") {
      const payload = await request.clone().json().catch(() => null);
      if (!loginForm.safeParse(payload).success) {
        return Response.json({ message: "Credenciais inválidas." }, { status: 400 });
      }
    }
  }

  return getAuth().handler(request);
}
