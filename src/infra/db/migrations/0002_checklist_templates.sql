CREATE TABLE "checklist_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "project_id" uuid REFERENCES "organizations"("id"),
  "version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "checklist_templates"("id"),
  "step_number" integer NOT NULL,
  "category" text NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "requires_photo" boolean DEFAULT false NOT NULL,
  "is_critical" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed default published template for each org
-- (Will be done programmatically at startup if no template exists)
