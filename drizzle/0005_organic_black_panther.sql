ALTER TABLE "health_records" ADD COLUMN "is_recurring" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "recurrence_pattern" varchar(20);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "recurrence_time" varchar(10);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "recurrence_days" varchar(50);