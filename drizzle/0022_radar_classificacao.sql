ALTER TABLE "participacao" ADD COLUMN "categoria_radar" text;--> statement-breakpoint
ALTER TABLE "participacao" ADD COLUMN "nota_radar" integer;--> statement-breakpoint
ALTER TABLE "participacao" ADD COLUMN "termos_radar" text[];--> statement-breakpoint
ALTER TABLE "participacao" ADD COLUMN "itens_consultados_em" timestamp with time zone;