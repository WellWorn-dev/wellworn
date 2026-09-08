CREATE TYPE "public"."node_status" AS ENUM('active', 'deprecated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('library', 'framework', 'tool', 'saas', 'skill', 'mcp_server', 'design_system', 'stack');--> statement-breakpoint
CREATE TYPE "public"."registry" AS ENUM('npm', 'pypi', 'packagist', 'crates', 'go', 'none');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'review', 'published', 'recheck', 'retired');--> statement-breakpoint
CREATE TYPE "public"."verdict_kind" AS ENUM('recommend', 'compare', 'alternatives', 'design', 'stack');--> statement-breakpoint
CREATE TYPE "public"."verdict_role" AS ENUM('pick', 'alternative', 'avoid', 'component');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('blocker', 'major', 'minor');--> statement-breakpoint
CREATE TYPE "public"."submission_source" AS ENUM('staff', 'mcp', 'web', 'github');--> statement-breakpoint
CREATE TYPE "public"."submission_channel" AS ENUM('mcp', 'web', 'github_pr');--> statement-breakpoint
CREATE TYPE "public"."submission_kind" AS ENUM('trap', 'verdict', 'correction');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'accepted', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."usage_scope" AS ENUM('ip', 'org');--> statement-breakpoint
CREATE TYPE "public"."credit_reason" AS ENUM('purchase', 'consumption', 'grant', 'refund');--> statement-breakpoint
CREATE TYPE "public"."plan_name" AS ENUM('free', 'pro', 'team');--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" "node_type" NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"license" text,
	"repo_url" text,
	"docs_url" text,
	"llms_txt_url" text,
	"registry" "registry" DEFAULT 'none' NOT NULL,
	"package_name" text,
	"latest_version" text,
	"last_release_at" timestamp with time zone,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "node_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "verdict_nodes" (
	"verdict_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"role" "verdict_role" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "verdict_nodes_verdict_id_node_id_role_pk" PRIMARY KEY("verdict_id","node_id","role")
);
--> statement-breakpoint
CREATE TABLE "verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "verdict_kind" NOT NULL,
	"question" text NOT NULL,
	"answer_md" text NOT NULL,
	"alt_md" text,
	"alt_wins_when" text,
	"avoid_md" text,
	"context_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"version_tested" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "verdicts"."question" || ' ' || "verdicts"."answer_md")) STORED,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_rev" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "verdicts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "traps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"version_range" text DEFAULT '*' NOT NULL,
	"symptom" text NOT NULL,
	"fix_md" text NOT NULL,
	"severity" "severity" DEFAULT 'major' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"evidence_url" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"submitted_by" uuid,
	"source" "submission_source" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"verdict_id" uuid,
	"node_id" uuid,
	"repo_path" text NOT NULL,
	"version" text DEFAULT '0.1.0' NOT NULL,
	"content_hash" text NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "submission_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"source" "submission_channel" NOT NULL,
	"submitter_key_id" text,
	"submitter_user_id" uuid,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"reviewer_id" uuid,
	"decided_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"nodes_checked" integer DEFAULT 0 NOT NULL,
	"flipped_to_recheck" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_daily" (
	"day" date NOT NULL,
	"scope" "usage_scope" NOT NULL,
	"scope_id" text NOT NULL,
	"tool" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_daily_day_scope_scope_id_tool_pk" PRIMARY KEY("day","scope","scope_id","tool")
);
--> statement-breakpoint
CREATE TABLE "usage_monthly" (
	"month" date NOT NULL,
	"org_id" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_monthly_month_org_id_pk" PRIMARY KEY("month","org_id")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "credit_reason" NOT NULL,
	"paddle_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paddle_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"org_id" text PRIMARY KEY NOT NULL,
	"paddle_customer_id" text,
	"paddle_subscription_id" text,
	"plan" "plan_name" DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"monthly_call_limit" integer DEFAULT 2000 NOT NULL,
	"burst_per_min" integer DEFAULT 30 NOT NULL,
	"renews_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verdict_nodes" ADD CONSTRAINT "verdict_nodes_verdict_id_verdicts_id_fk" FOREIGN KEY ("verdict_id") REFERENCES "public"."verdicts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verdict_nodes" ADD CONSTRAINT "verdict_nodes_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traps" ADD CONSTRAINT "traps_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_verdict_id_verdicts_id_fk" FOREIGN KEY ("verdict_id") REFERENCES "public"."verdicts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nodes_type_idx" ON "nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "nodes_package_idx" ON "nodes" USING btree ("registry","package_name");--> statement-breakpoint
CREATE INDEX "verdicts_search_idx" ON "verdicts" USING gin ("search");--> statement-breakpoint
CREATE INDEX "verdicts_status_kind_idx" ON "verdicts" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "traps_node_status_idx" ON "traps" USING btree ("node_id","status");