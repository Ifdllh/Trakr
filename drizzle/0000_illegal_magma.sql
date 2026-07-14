CREATE TABLE "budget_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"period_id" integer,
	"global_budget_id" integer,
	"category_id" text,
	"type" text,
	"value" double precision,
	"calculated_amount" double precision,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"period_id" integer,
	"total_target_amount" double precision,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"account_name" text,
	"account_type" text,
	"balance" double precision,
	"color" text,
	"icon" text,
	"account_number" text,
	"include_in_net_worth" boolean,
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"asset_name" text,
	"asset_category" text,
	"current_value" double precision,
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text,
	"type" text,
	"parent_category" text,
	"icon_name" text,
	"color_class" text,
	"color_hex" text,
	"subcategories" text[],
	"inactive_subcategories" text[],
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"contact_name" text,
	"contact_type" text,
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text,
	"start_date" text,
	"end_date" text,
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tag_name" text,
	"description" text,
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" text,
	"amount" double precision,
	"category" text,
	"subcategory" text,
	"description" text,
	"date" text,
	"account_id" integer,
	"destination_account_id" integer,
	"asset_id" integer,
	"tag_id" integer,
	"contact_id" integer,
	"period_id" integer,
	"split_group_id" text,
	"attachment_url" text,
	"is_recurring" boolean,
	"recurring_frequency" text,
	"recurring_end_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text,
	"email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE INDEX "budget_allocations_user_id_idx" ON "budget_allocations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_period_id_idx" ON "budget_allocations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_global_budget_id_idx" ON "budget_allocations" USING btree ("global_budget_id");--> statement-breakpoint
CREATE INDEX "global_budgets_user_id_idx" ON "global_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "global_budgets_period_id_idx" ON "global_budgets" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "master_accounts_user_id_idx" ON "master_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "master_assets_user_id_idx" ON "master_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "master_categories_user_id_idx" ON "master_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "master_contacts_user_id_idx" ON "master_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "master_periods_user_id_idx" ON "master_periods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "master_tags_user_id_idx" ON "master_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_dest_account_id_idx" ON "transactions" USING btree ("destination_account_id");--> statement-breakpoint
CREATE INDEX "transactions_asset_id_idx" ON "transactions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "transactions_tag_id_idx" ON "transactions" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "transactions_contact_id_idx" ON "transactions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "transactions_period_id_idx" ON "transactions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date");