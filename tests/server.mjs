import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create();

const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0, maxConnections: 10 });
await server.start();

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres@" + server.getServerConn() + "/postgres",
  DATABASE_URL_DIRECT: "",
  BETTER_AUTH_URL: "http://127.0.0.1:3841",
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  ADMIN_EMAIL: "admin@example.test",
  ADMIN_PASSWORD: "senha-apenas-do-teste",
  RESEND_API_KEY: "",
  RESET_FROM: "",
  AUTH_IP_HEADER: "",
  ENABLE_OSM_PILOT: "true",
  ENABLE_OSM_SALVADOR_EXTRACT: process.env.PLAYWRIGHT_REAL_EXTRACT === "true" ? "true" : "false",
  GEMINI_API_KEY: "chave-ficticia-apenas-do-teste",
  AI_PROVIDER: "gemini",
  AI_DAILY_LIMIT: "5",
  AI_MONTHLY_BUDGET_USD: "5",
};

function run(script, ...args) {
  return spawn(process.execPath, [script, ...args], { env, stdio: "inherit" });
}

for (const [script, argument] of [
  ["node_modules/drizzle-kit/bin.cjs", "migrate"],
  ["node_modules/tsx/dist/cli.mjs", "scripts/admin.ts"],
]) {
  const child = run(script, argument);
  const result = await new Promise(resolve => child.once("exit", resolve));
  if (result !== 0) process.exit(1);
}

const expiredToken = Buffer.alloc(32, 163).toString("base64url");
await db.query(`
  with company as (
    insert into companies (name, segment, country, state, city, identity_key, created_at)
      values ('Empresa da prévia expirada', 'Serviços', 'Brasil', 'Bahia', 'Salvador', 'fixture-expirada', '2000-01-01') returning id
  ), project as (
    insert into website_projects (company_id, template, status, model, cost_micros, created_at)
      select id, 'services', 'ready', 'fixture', 0, '2000-01-01' from company returning id
  )
  insert into website_share_links (project_id, revision, token_hash, snapshot, expires_at)
    select id, 0, $1, $2::jsonb, '2000-01-02' from project
`, [createHash("sha256").update(expiredToken).digest("hex"), JSON.stringify({
  template: "services", version: 1, name: "Empresa da prévia expirada", segment: "Serviços", city: "Salvador", state: "Bahia",
  services: [], benefits: [], serviceDescriptions: [], tone: "suave", valueProposition: "Conheça a empresa.",
  copy: { headline: "Título da prévia expirada", subtitle: "Uma demonstração de teste.", about: "Conteúdo de teste.", action: "Saiba mais" },
})]);

const app = run("--import", "./tests/overpass-fixture.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3841", "--hostname", "127.0.0.1");
process.on("SIGINT", () => app.kill());
process.on("SIGTERM", () => app.kill());
app.once("exit", async code => {
  await server.stop();
  await db.close();
  process.exit(code ?? 0);
});
