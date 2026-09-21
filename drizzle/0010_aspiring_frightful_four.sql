CREATE TYPE "public"."instrumento_recurso" AS ENUM('dotacao_propria', 'convenio', 'contrato_repasse', 'emenda_parlamentar', 'termo_fomento', 'financiamento', 'outro');--> statement-breakpoint
CREATE TYPE "public"."origem_recurso" AS ENUM('federal', 'estadual', 'municipal', 'misto', 'terceiro', 'nao_identificado');--> statement-breakpoint
CREATE TYPE "public"."semaforo_recurso" AS ENUM('verde', 'amarelo', 'vermelho');--> statement-breakpoint
CREATE TYPE "public"."situacao_recurso" AS ENUM('apenas_previsto', 'empenhado', 'liquidado', 'pago', 'nao_localizado');--> statement-breakpoint
CREATE TABLE "ficha_recurso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"dotacao_orcamentaria" jsonb,
	"origem" "origem_recurso",
	"origem_percentuais" jsonb,
	"instrumento" "instrumento_recurso",
	"situacao" "situacao_recurso",
	"numero_instrumento" text,
	"valor_recurso" numeric(14, 2),
	"vigencia_em" timestamp with time zone,
	"prazo_estimado_pagamento_em" timestamp with time zone,
	"evidencia" text,
	"semaforo" "semaforo_recurso",
	"semaforo_fatores" jsonb,
	"ciencia_confirmada" boolean DEFAULT false NOT NULL,
	"ciencia_confirmada_por_user_id" text,
	"ciencia_confirmada_em" timestamp with time zone,
	"ciencia_semaforo" "semaforo_recurso",
	"ciencia_fatores" jsonb,
	"anotacao_operador" text,
	"anotacao_autor_id" text,
	"anotacao_em" timestamp with time zone,
	"preenchido_por_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ficha_recurso_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "ficha_recurso" ADD CONSTRAINT "ficha_recurso_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_recurso" ADD CONSTRAINT "ficha_recurso_ciencia_confirmada_por_user_id_user_id_fk" FOREIGN KEY ("ciencia_confirmada_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_recurso" ADD CONSTRAINT "ficha_recurso_anotacao_autor_id_user_id_fk" FOREIGN KEY ("anotacao_autor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_recurso" ADD CONSTRAINT "ficha_recurso_preenchido_por_user_id_user_id_fk" FOREIGN KEY ("preenchido_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;