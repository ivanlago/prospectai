import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { getDb } from "@/db";
import { websiteEditAttempts, websiteProjects } from "@/db/schema";

const limits = z.object({
  daily: z.coerce.number().int().min(1).max(100).default(5),
  budget: z.coerce.number().min(0).max(1000).default(5),
});

export function generationConfig() {
  return limits.safeParse({ daily: process.env.AI_DAILY_LIMIT || undefined, budget: process.env.AI_MONTHLY_BUDGET_USD || undefined }).data;
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function claimAiBudget(tx: Transaction, config: z.infer<typeof limits>, reservedMicros: number) {
  await tx.execute(sql`select pg_advisory_xact_lock(7384503)`);
  const failure = { status: "failed" as const, error: "timeout", finishedAt: new Date() };
  await tx.update(websiteProjects).set(failure).where(and(eq(websiteProjects.status, "running"),
    sql`${websiteProjects.createdAt} < now() - interval '90 seconds'`));
  await tx.update(websiteEditAttempts).set(failure).where(and(eq(websiteEditAttempts.status, "running"),
    sql`${websiteEditAttempts.createdAt} < now() - interval '90 seconds'`));
  const { rows: [usage] } = await tx.execute<{ daily: number; monthly: number; running: boolean }>(sql`
    with attempts as (
      select status, created_at, cost_micros from ${websiteProjects}
        where status = 'running' or created_at >= date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia'
      union all
      select status, created_at, cost_micros from ${websiteEditAttempts}
        where status = 'running' or created_at >= date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia'
    )
    select count(*) filter (where created_at >= date_trunc('day', now() at time zone 'America/Bahia') at time zone 'America/Bahia')::int as daily,
      coalesce(sum(cost_micros) filter (where created_at >= date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia'), 0)::float8 as monthly,
      coalesce(bool_or(status = 'running'), false) as running
    from attempts
  `);
  if (usage.running) return "running";
  if (usage.daily >= config.daily) return "daily";
  if (usage.monthly + reservedMicros > Math.floor(config.budget * 1000000)) return "budget";
}
