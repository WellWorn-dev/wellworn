import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const planName = pgEnum("plan_name", ["free", "pro", "team"]);
export const creditReason = pgEnum("credit_reason", ["purchase", "consumption", "grant", "refund"]);

export const plans = pgTable("plans", {
  orgId: text("org_id").primaryKey(),
  paddleCustomerId: text("paddle_customer_id"),
  paddleSubscriptionId: text("paddle_subscription_id"),
  plan: planName("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  seats: integer("seats").notNull().default(1),
  monthlyCallLimit: integer("monthly_call_limit").notNull().default(2000),
  burstPerMin: integer("burst_per_min").notNull().default(30),
  renewsAt: timestamp("renews_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  delta: integer("delta").notNull(),
  reason: creditReason("reason").notNull(),
  paddleTransactionId: text("paddle_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paddleEvents = pgTable("paddle_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
});
