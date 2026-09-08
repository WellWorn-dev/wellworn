ALTER TABLE "nodes" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "demo_url" text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "attribution" text;