CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
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
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geofences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_route_corridors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"buffer_meters" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_nfc_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"card_uid" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" uuid,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoke_reason" text
);
--> statement-breakpoint
CREATE TABLE "inspection_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"assigned_to" uuid,
	"due_date" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"result" jsonb,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"critical_defects" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"campaign_type" text NOT NULL,
	"description" text,
	"vehicle_scope" jsonb DEFAULT '{}'::jsonb,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_by_role" text,
	"org_id" uuid NOT NULL,
	"findings_summary" jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_critical" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"photo_url" text
);
--> statement-breakpoint
CREATE TABLE "job_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_number" text NOT NULL,
	"journey_id" uuid,
	"work_order_ref" text,
	"job_type" text NOT NULL,
	"purpose" text,
	"destination_lat" numeric(10, 7),
	"destination_lon" numeric(10, 7),
	"planned_start" timestamp with time zone,
	"planned_end" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_plans_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "job_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"waypoint_id" uuid,
	"type" text NOT NULL,
	"file_url" text NOT NULL,
	"captured_by" uuid NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_lat" numeric(10, 7),
	"device_lon" numeric(10, 7)
);
--> statement-breakpoint
CREATE TABLE "job_waypoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"name" text NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lon" numeric(10, 7) NOT NULL,
	"planned_arrival" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"proof_type" text DEFAULT 'none' NOT NULL,
	"proof_data" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "loading_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"file_url" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_by" uuid NOT NULL,
	"exif_stripped" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loading_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"job_id" uuid,
	"sequence" integer DEFAULT 1 NOT NULL,
	"material_ref" text,
	"material_description" text NOT NULL,
	"quantity" numeric(12, 3),
	"uom" text,
	"loading_lat" numeric(10, 7),
	"loading_lon" numeric(10, 7),
	"unloading_lat" numeric(10, 7),
	"unloading_lon" numeric(10, 7),
	"load_time" timestamp with time zone,
	"unload_time" timestamp with time zone,
	"loading_clerk_id" uuid,
	"supervisor_approved_by" uuid,
	"status" text DEFAULT 'planned' NOT NULL,
	"notes" text,
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"provider_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"params" jsonb,
	"file_key" text,
	"file_size_bytes" text,
	"error_message" text,
	"requested_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"cron_expression" text NOT NULL,
	"params" jsonb,
	"recipient_user_ids" jsonb DEFAULT '[]'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "push_token" text;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_project_id_organizations_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_route_corridors" ADD CONSTRAINT "journey_route_corridors_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_nfc_cards" ADD CONSTRAINT "driver_nfc_cards_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_nfc_cards" ADD CONSTRAINT "driver_nfc_cards_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_nfc_cards" ADD CONSTRAINT "driver_nfc_cards_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_campaign_id_inspection_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."inspection_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_campaigns" ADD CONSTRAINT "inspection_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_campaigns" ADD CONSTRAINT "inspection_campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_campaign_id_inspection_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."inspection_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_assignment_id_inspection_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."inspection_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_item_id_inspection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspection_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_plans" ADD CONSTRAINT "job_plans_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_plans" ADD CONSTRAINT "job_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_plans" ADD CONSTRAINT "job_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_proofs" ADD CONSTRAINT "job_proofs_job_id_job_plans_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_proofs" ADD CONSTRAINT "job_proofs_waypoint_id_job_waypoints_id_fk" FOREIGN KEY ("waypoint_id") REFERENCES "public"."job_waypoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_proofs" ADD CONSTRAINT "job_proofs_captured_by_users_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_waypoints" ADD CONSTRAINT "job_waypoints_job_id_job_plans_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_evidence" ADD CONSTRAINT "loading_evidence_segment_id_loading_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."loading_segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_evidence" ADD CONSTRAINT "loading_evidence_captured_by_users_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_segments" ADD CONSTRAINT "loading_segments_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_segments" ADD CONSTRAINT "loading_segments_job_id_job_plans_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_segments" ADD CONSTRAINT "loading_segments_loading_clerk_id_users_id_fk" FOREIGN KEY ("loading_clerk_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_segments" ADD CONSTRAINT "loading_segments_supervisor_approved_by_users_id_fk" FOREIGN KEY ("supervisor_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_segments" ADD CONSTRAINT "loading_segments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inspection_assignments_campaign" ON "inspection_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_inspection_assignments_vehicle" ON "inspection_assignments" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE INDEX "idx_inspection_campaigns_org_status" ON "inspection_campaigns" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_plans_org_status" ON "job_plans" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_plans_journey" ON "job_plans" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_loading_segments_journey" ON "loading_segments" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_loading_segments_org_status" ON "loading_segments" USING btree ("org_id","status");