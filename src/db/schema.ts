import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { stageKeys } from "../domain";

const date = (name: string) => timestamp(name, { withTimezone: true });
const created = () => date("created_at").notNull().defaultNow();
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: date("createdAt").notNull().defaultNow(),
  updatedAt: date("updatedAt").notNull().defaultNow(),
}, () => [uniqueIndex("single_administrator").on(sql`(1)`)]);

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: date("expiresAt").notNull(),
  createdAt: date("createdAt").notNull(),
  updatedAt: date("updatedAt").notNull(),
  ipAddress: text(),
  userAgent: text(),
}, table => [index().on(table.userId)]);

export const accounts = pgTable("accounts", {
  id: uuid().primaryKey().defaultRandom(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  password: text(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: date("accessTokenExpiresAt"),
  refreshTokenExpiresAt: date("refreshTokenExpiresAt"),
  scope: text(),
  createdAt: date("createdAt").notNull(),
  updatedAt: date("updatedAt").notNull(),
}, table => [uniqueIndex().on(table.providerId, table.accountId), index().on(table.userId)]);

export const verifications = pgTable("verifications", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: date("expiresAt").notNull(),
  createdAt: date("createdAt").notNull(),
  updatedAt: date("updatedAt").notNull(),
}, table => [index().on(table.identifier)]);

export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull(),
  window: integer().notNull(),
});

export const crmStage = pgEnum("crm_stage", stageKeys);
export const companies = pgTable("companies", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  segment: text().notNull(),
  country: text().notNull(),
  state: text().notNull(),
  city: text().notNull(),
  address: text().notNull().default(""),
  website: text().notNull().default(""),
  contact: text().notNull().default(""),
  notes: text().notNull().default(""),
  identityKey: text("identity_key").notNull().unique(),
  source: text().notNull().default("manual"),
  stage: crmStage().notNull().default("new"),
  createdAt: created(),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, table => [index().on(table.createdAt), index().on(table.stage)]);

export const searches = pgTable("searches", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  config: jsonb().notNull(),
  createdAt: created(),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, table => [index().on(table.createdAt)]);

export const runStatus = pgEnum("search_run_status", ["running", "completed", "failed", "cancelled"]);
export const searchRuns = pgTable("search_runs", {
  id: uuid().primaryKey().defaultRandom(),
  searchId: uuid("search_id").references(() => searches.id, { onDelete: "set null" }),
  provider: text().notNull(),
  status: runStatus().notNull().default("running"),
  filters: jsonb().notNull(),
  createdAt: created(),
  finishedAt: date("finished_at"),
  expiresAt: date("expires_at").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  truncated: boolean().notNull().default(false),
  error: text(),
}, table => [index().on(table.searchId, table.createdAt), index().on(table.provider, table.createdAt)]);

export const discoveryResults = pgTable("discovery_results", {
  id: uuid().primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => searchRuns.id, { onDelete: "cascade" }),
  reference: text().notNull(),
  name: text().notNull(),
  website: text().notNull().default(""),
  district: text().notNull().default(""),
  identityKey: text("identity_key").notNull(),
}, table => [uniqueIndex().on(table.runId, table.reference), index().on(table.runId, table.name)]);

export const websiteReviews = pgTable("website_reviews", {
  resultId: uuid("result_id").primaryKey().references(() => discoveryResults.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  presence: text().notNull(),
  evidence: text().notNull(),
  website: text().notNull(),
  score: integer().notNull(),
  breakdown: jsonb().notNull(),
  qualified: boolean().notNull(),
  reviewedAt: date("reviewed_at").notNull().defaultNow(),
});

export const companySources = pgTable("company_sources", {
  companyId: uuid("company_id").primaryKey().references(() => companies.id, { onDelete: "cascade" }),
  provider: text().notNull(),
  reference: text().notNull(),
  permission: text().notNull(),
  review: jsonb().notNull(),
  createdAt: created(),
}, table => [uniqueIndex().on(table.provider, table.reference)]);

export const activities = pgTable("activities", {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text().notNull(),
  detail: text().notNull(),
  createdAt: created(),
}, table => [index().on(table.companyId, table.createdAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid().primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  entityId: uuid("entity_id").notNull(),
  event: text().notNull(),
  createdAt: created(),
}, table => [index().on(table.createdAt)]);
