CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before_value" jsonb,
	"after_value" jsonb,
	"status_code" integer,
	"ip" text,
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"org_id" uuid
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"serial_no" text NOT NULL,
	"imei" text,
	"sim_no" text,
	"apn" text,
	"vehicle_id" uuid,
	"firmware" text,
	"last_seen" timestamp with time zone,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"gps_quality" integer,
	"battery_pct" integer,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"reference_no" text,
	"issued_date" date,
	"expiry_date" date NOT NULL,
	"reminder_days" integer[] DEFAULT '{90,60,30,7}',
	"file_url" text,
	"status" text DEFAULT 'valid' NOT NULL,
	"blocks_on_expiry" boolean DEFAULT true NOT NULL,
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text,
	"name" text NOT NULL,
	"license_no" text NOT NULL,
	"license_class" text NOT NULL,
	"license_expiry" date NOT NULL,
	"ddc_expiry" date,
	"medical_expiry" date,
	"authorized_types" text[],
	"nfc_card_uid" text,
	"nfc_issued_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"score" numeric(5, 2),
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_nfc_card_uid_unique" UNIQUE("nfc_card_uid")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid,
	"journey_id" uuid,
	"device_id" uuid,
	"event_type" text NOT NULL,
	"severity" text NOT NULL,
	"lat" numeric(10, 7),
	"lon" numeric(10, 7),
	"speed" numeric(6, 2),
	"details" jsonb,
	"action_status" text DEFAULT 'open' NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"period" text NOT NULL,
	"overspeed_count" integer DEFAULT 0 NOT NULL,
	"harsh_braking_count" integer DEFAULT 0 NOT NULL,
	"harsh_accel_count" integer DEFAULT 0 NOT NULL,
	"idle_count" integer DEFAULT 0 NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"compliance_score" numeric(5, 2),
	"total_score" numeric(5, 2),
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"skip_reason" text
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"journey_id" uuid,
	"tier" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"situation" text,
	"lat" numeric(10, 7),
	"lon" numeric(10, 7),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"closure_report" text,
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boarding_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"passenger_id" uuid,
	"method" text NOT NULL,
	"validation_result" text NOT NULL,
	"lat" text,
	"lon" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"exception_flag" text DEFAULT 'false' NOT NULL,
	"exception_note" text
);
--> statement-breakpoint
CREATE TABLE "journey_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"step" text NOT NULL,
	"user_id" uuid,
	"decision" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_passengers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"passenger_id" uuid,
	"passenger_name" text NOT NULL,
	"employee_id" text,
	"department" text,
	"pickup_point" text,
	"boarding_status" text DEFAULT 'manifested' NOT NULL,
	"boarding_method" text,
	"boarded_at" timestamp with time zone,
	"alighted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journey_waypoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"name" text NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lon" numeric(10, 7) NOT NULL,
	"planned_arrival" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_no" text NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"purpose" text,
	"planned_departure" timestamp with time zone NOT NULL,
	"planned_arrival" timestamp with time zone NOT NULL,
	"actual_departure" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"risk_score" numeric(4, 2),
	"risk_level" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"emergency_contact" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"rejection_reason" text,
	"vehicle_status_snapshot" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journeys_journey_no_unique" UNIQUE("journey_no")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"channels" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"data" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passenger_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_no" text NOT NULL,
	"user_id" uuid NOT NULL,
	"pickup_location_id" uuid,
	"drop_location_id" uuid,
	"pickup_name" text,
	"drop_name" text,
	"requested_time" timestamp with time zone NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"trip_type" text DEFAULT 'one_way' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pool_id" uuid,
	"journey_id" uuid,
	"rejection_reason" text,
	"notes" text,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passenger_requests_request_no_unique" UNIQUE("request_no")
);
--> statement-breakpoint
CREATE TABLE "request_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_time" timestamp with time zone,
	"pickup_area" text,
	"drop_area" text,
	"planner_id" uuid,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"request_count" text DEFAULT '0' NOT NULL,
	"capacity_needed" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"driver_id" uuid,
	"journey_id" uuid,
	"lat" numeric(10, 7) NOT NULL,
	"lon" numeric(10, 7) NOT NULL,
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"ignition" boolean,
	"fuel_pct" integer,
	"engine_rpm" integer,
	"odometer" integer,
	"engine_hours" integer,
	"raw_payload" jsonb,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_no" text NOT NULL,
	"brand" text,
	"model" text,
	"size" text,
	"vehicle_id" uuid,
	"axle_position" text,
	"install_date" date,
	"install_odometer" integer,
	"tread_depth_mm" numeric(4, 1),
	"pressure_psi" numeric(5, 1),
	"status" text DEFAULT 'active' NOT NULL,
	"disposal_reason" text,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tires_serial_no_unique" UNIQUE("serial_no")
);
--> statement-breakpoint
CREATE TABLE "transport_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"eligible_routes" uuid[],
	"allowed_days" text[],
	"approver_id" uuid,
	"validity_start" timestamp with time zone NOT NULL,
	"validity_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"name" text NOT NULL,
	"role_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mfa_secret" text,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_no" text NOT NULL,
	"fleet_no" text,
	"vin" text,
	"engine_no" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"type" text NOT NULL,
	"seat_count" integer NOT NULL,
	"owner" text,
	"project_id" uuid,
	"base_location" text,
	"status" text DEFAULT 'available' NOT NULL,
	"conditional_expiry" timestamp with time zone,
	"odometer" integer,
	"engine_hours" integer,
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_plate_format" CHECK ("vehicles"."plate_no" ~ '^d{1,2}-[A-Z]-d{3,4}$')
);
--> statement-breakpoint
CREATE TABLE "work_order_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wo_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"details" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wo_id" uuid NOT NULL,
	"part_number" text NOT NULL,
	"part_name" text NOT NULL,
	"oem_aftermarket" text,
	"supplier" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"warranty_months" integer,
	"old_part_disposed" boolean DEFAULT false NOT NULL,
	"cost_baisa" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wo_id" uuid NOT NULL,
	"label" text,
	"file_url" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wo_number" text NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"issue_type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'inbound' NOT NULL,
	"bay" text,
	"technician_id" uuid,
	"release_decision" text,
	"release_reason" text,
	"release_expiry" timestamp with time zone,
	"hse_cosign" text DEFAULT 'auto' NOT NULL,
	"hse_approved_by" uuid,
	"hse_approved_at" timestamp with time zone,
	"odometer_at" integer,
	"engine_hours_at" integer,
	"opened_by" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"target_hours" numeric(4, 1),
	"org_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_wo_number_unique" UNIQUE("wo_number")
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"current_node" text,
	"status" text DEFAULT 'running' NOT NULL,
	"context" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_scores" ADD CONSTRAINT "driver_scores_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_scores" ADD CONSTRAINT "driver_scores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_steps" ADD CONSTRAINT "incident_steps_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_steps" ADD CONSTRAINT "incident_steps_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_events" ADD CONSTRAINT "boarding_events_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_approvals" ADD CONSTRAINT "journey_approvals_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_approvals" ADD CONSTRAINT "journey_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_passengers" ADD CONSTRAINT "journey_passengers_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_waypoints" ADD CONSTRAINT "journey_waypoints_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passenger_requests" ADD CONSTRAINT "passenger_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passenger_requests" ADD CONSTRAINT "passenger_requests_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passenger_requests" ADD CONSTRAINT "passenger_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_pools" ADD CONSTRAINT "request_pools_planner_id_users_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_pools" ADD CONSTRAINT "request_pools_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_entitlements" ADD CONSTRAINT "transport_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_entitlements" ADD CONSTRAINT "transport_entitlements_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_entitlements" ADD CONSTRAINT "transport_entitlements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_project_id_organizations_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_activity" ADD CONSTRAINT "work_order_activity_wo_id_work_orders_id_fk" FOREIGN KEY ("wo_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_activity" ADD CONSTRAINT "work_order_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_parts" ADD CONSTRAINT "work_order_parts_wo_id_work_orders_id_fk" FOREIGN KEY ("wo_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_photos" ADD CONSTRAINT "work_order_photos_wo_id_work_orders_id_fk" FOREIGN KEY ("wo_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_photos" ADD CONSTRAINT "work_order_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_hse_approved_by_users_id_fk" FOREIGN KEY ("hse_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_version_id_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workflow_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_documents_entity" ON "documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_documents_expiry" ON "documents" USING btree ("expiry_date","status");--> statement-breakpoint
CREATE INDEX "idx_events_vehicle_time" ON "events" USING btree ("vehicle_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_events_severity" ON "events" USING btree ("severity","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_events_journey" ON "events" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_driver_scores_period" ON "driver_scores" USING btree ("driver_id","period");--> statement-breakpoint
CREATE INDEX "idx_incidents_status" ON "incidents" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "idx_incidents_vehicle" ON "incidents" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_journeys_status" ON "journeys" USING btree ("status","planned_departure");--> statement-breakpoint
CREATE INDEX "idx_journeys_vehicle" ON "journeys" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE INDEX "idx_journeys_driver" ON "journeys" USING btree ("driver_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "idx_pax_requests_status" ON "passenger_requests" USING btree ("status","requested_time");--> statement-breakpoint
CREATE INDEX "idx_pax_requests_user" ON "passenger_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_telemetry_vehicle_time" ON "telemetry_logs" USING btree ("vehicle_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_telemetry_journey" ON "telemetry_logs" USING btree ("journey_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_wo_vehicle" ON "work_orders" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE INDEX "idx_wo_status" ON "work_orders" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "idx_wf_exec_entity" ON "workflow_executions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_wf_exec_status" ON "workflow_executions" USING btree ("status");