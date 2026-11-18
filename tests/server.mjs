import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
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

const app = run("--import", "./tests/overpass-fixture.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3841", "--hostname", "127.0.0.1");
process.on("SIGINT", () => app.kill());
process.on("SIGTERM", () => app.kill());
app.once("exit", async code => {
  await server.stop();
  await db.close();
  process.exit(code ?? 0);
});
