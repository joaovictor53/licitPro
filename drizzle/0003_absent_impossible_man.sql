ALTER TABLE "user" ADD COLUMN "plano" text DEFAULT 'gratis' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "razao_social" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "cnpj" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "endereco" text;