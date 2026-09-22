CREATE TYPE "public"."resultado_desfecho" AS ENUM('vencedora', 'perdedora', 'desclassificada', 'inabilitada', 'desistente', 'certame_anulado', 'revogado', 'fracassado', 'deserto');--> statement-breakpoint
CREATE TYPE "public"."tipo_contrato" AS ENUM('contrato', 'ata_registro_precos');--> statement-breakpoint
CREATE TABLE "contrato_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"tipo" "tipo_contrato" NOT NULL,
	"numero" text NOT NULL,
	"data_assinatura_em" timestamp with time zone,
	"vigencia_inicio_em" timestamp with time zone,
	"vigencia_fim_em" timestamp with time zone,
	"valor_contratado" numeric(14, 2),
	"objeto_contratado" text,
	"arquivo_assinado_nome" text,
	"arquivo_assinado_base64" text,
	"gestor_fiscal_nome" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contrato_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "empenho_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"numero_nota_empenho" text NOT NULL,
	"data_em" timestamp with time zone NOT NULL,
	"valor_empenhado" numeric(14, 2) NOT NULL,
	"saldo" numeric(14, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garantia_contratual" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"forma_escolhida" "forma_garantia" DEFAULT 'nenhuma' NOT NULL,
	"valor" numeric(14, 2),
	"prazo_apresentacao_em" timestamp with time zone,
	"vigencia_inicio_em" timestamp with time zone,
	"vigencia_fim_em" timestamp with time zone,
	"comprovante_texto" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "garantia_contratual_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "pagamento_contrato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"data_nota_fiscal_em" timestamp with time zone NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"data_prevista_pagamento_em" timestamp with time zone,
	"data_efetiva_pagamento_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resultado_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"resultado" "resultado_desfecho" NOT NULL,
	"motivo_estruturado" text NOT NULL,
	"valor_vencedor_global" numeric(14, 2),
	"diferenca_para_vencedor_absoluta" numeric(14, 2),
	"diferenca_para_vencedor_percentual" numeric(6, 2),
	"data_resultado_em" timestamp with time zone NOT NULL,
	"adjudicacao_data_em" timestamp with time zone,
	"adjudicacao_quem" text,
	"homologacao_data_em" timestamp with time zone,
	"homologacao_publicacao" text,
	"registrado_por_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resultado_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "sancao_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"motivo" text NOT NULL,
	"data_em" timestamp with time zone NOT NULL,
	"vigencia_fim_em" timestamp with time zone,
	"documento_texto" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contrato_participacao" ADD CONSTRAINT "contrato_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empenho_participacao" ADD CONSTRAINT "empenho_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garantia_contratual" ADD CONSTRAINT "garantia_contratual_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento_contrato" ADD CONSTRAINT "pagamento_contrato_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultado_participacao" ADD CONSTRAINT "resultado_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultado_participacao" ADD CONSTRAINT "resultado_participacao_registrado_por_user_id_user_id_fk" FOREIGN KEY ("registrado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sancao_participacao" ADD CONSTRAINT "sancao_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "empenho_participacao_participacao_id_idx" ON "empenho_participacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "pagamento_contrato_participacao_id_idx" ON "pagamento_contrato" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "sancao_participacao_participacao_id_idx" ON "sancao_participacao" USING btree ("participacao_id");