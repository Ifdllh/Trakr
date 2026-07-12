CREATE TABLE "budget_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"global_budget_id" integer NOT NULL,
	"category_id" text NOT NULL,
	"type" text NOT NULL,
	"value" double precision NOT NULL,
	"calculated_amount" double precision NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"total_target_amount" double precision NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "uniq_period_user" UNIQUE("period_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "master_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"account_number" text,
	"balance" double precision NOT NULL,
	"color" text DEFAULT '#4f46e5',
	"icon" text,
	"include_in_net_worth" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"asset_name" text NOT NULL,
	"asset_category" text NOT NULL,
	"current_value" double precision NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"icon_name" text NOT NULL,
	"color_class" text NOT NULL,
	"color_hex" text DEFAULT '#6366F1' NOT NULL,
	"parent_category" text,
	"subcategories" text[],
	"is_active" boolean DEFAULT true,
	"inactive_subcategories" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contact_name" text NOT NULL,
	"contact_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tag_name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"date" text NOT NULL,
	"description" text,
	"account_id" integer,
	"asset_id" integer,
	"tag_id" integer,
	"contact_id" integer,
	"period_id" integer,
	"split_group_id" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_period_id_master_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."master_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_global_budget_id_global_budgets_id_fk" FOREIGN KEY ("global_budget_id") REFERENCES "public"."global_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_budgets" ADD CONSTRAINT "global_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_budgets" ADD CONSTRAINT "global_budgets_period_id_master_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."master_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_accounts" ADD CONSTRAINT "master_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_assets" ADD CONSTRAINT "master_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_categories" ADD CONSTRAINT "master_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_contacts" ADD CONSTRAINT "master_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_periods" ADD CONSTRAINT "master_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_tags" ADD CONSTRAINT "master_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_master_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."master_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_master_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."master_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tag_id_master_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."master_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contact_id_master_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."master_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_period_id_master_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."master_periods"("id") ON DELETE no action ON UPDATE no action;