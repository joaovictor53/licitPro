CREATE TABLE "analise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"nome_edital" text NOT NULL,
	"nome_proposta" text NOT NULL,
	"resumo" text NOT NULL,
	"total_irregularidades" integer NOT NULL,
	"total_material" integer NOT NULL,
	"total_sanavel" integer NOT NULL,
	"resultado" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "analise" ADD CONSTRAINT "analise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analise_user_id_idx" ON "analise" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analise_created_at_idx" ON "analise" USING btree ("created_at");