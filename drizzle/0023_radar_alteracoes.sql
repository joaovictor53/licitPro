CREATE TABLE "edital_alteracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_controle_pncp" text NOT NULL,
	"campo" text NOT NULL,
	"antes" text,
	"depois" text,
	"detectada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "edital_alteracao_numero_idx" ON "edital_alteracao" USING btree ("numero_controle_pncp","detectada_em");