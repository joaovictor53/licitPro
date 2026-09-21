CREATE TYPE "public"."confianca_leitura" AS ENUM('alta', 'media', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."risco_exigencia" AS ENUM('desclassifica', 'inabilita', 'sanavel');--> statement-breakpoint
CREATE TYPE "public"."situacao_exigencia" AS ENUM('atende', 'nao_atende', 'parcial', 'a_verificar');--> statement-breakpoint
CREATE TYPE "public"."tipo_exigencia" AS ENUM('habilitacao', 'proposta', 'tecnica', 'acessoria', 'prazo', 'comercial');--> statement-breakpoint
CREATE TABLE "edital" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"enviado_por_user_id" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"hash" text NOT NULL,
	"num_paginas" integer NOT NULL,
	"texto_extraido" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "edital_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "exigencia_edital" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"titulo" text NOT NULL,
	"tipo" "tipo_exigencia" NOT NULL,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	"o_que_exige" text NOT NULL,
	"criterio_aceitacao" text,
	"trecho" text NOT NULL,
	"pagina" integer,
	"clausula" text,
	"risco" "risco_exigencia" NOT NULL,
	"confianca" "confianca_leitura" NOT NULL,
	"requer_verificacao_manual" boolean DEFAULT false NOT NULL,
	"situacao" "situacao_exigencia" DEFAULT 'a_verificar' NOT NULL,
	"conferido_por_user_id" text,
	"conferido_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edital" ADD CONSTRAINT "edital_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edital" ADD CONSTRAINT "edital_enviado_por_user_id_user_id_fk" FOREIGN KEY ("enviado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exigencia_edital" ADD CONSTRAINT "exigencia_edital_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exigencia_edital" ADD CONSTRAINT "exigencia_edital_conferido_por_user_id_user_id_fk" FOREIGN KEY ("conferido_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exigencia_edital_participacao_id_idx" ON "exigencia_edital" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "exigencia_edital_risco_idx" ON "exigencia_edital" USING btree ("risco");