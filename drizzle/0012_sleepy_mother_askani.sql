CREATE TYPE "public"."forma_garantia" AS ENUM('nenhuma', 'caucao_dinheiro', 'seguro_garantia', 'fianca_bancaria', 'titulo_publico');--> statement-breakpoint
CREATE TABLE "cotacao_fornecedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fornecedor" text NOT NULL,
	"item" text NOT NULL,
	"valor_unitario" numeric(14, 4) NOT NULL,
	"cotado_em" timestamp with time zone NOT NULL,
	"valida_ate_em" timestamp with time zone,
	"criado_por_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfil_financeiro_empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"aliquota_efetiva_percentual" numeric(5, 2),
	"aliquota_informada_por_user_id" text,
	"aliquota_informada_em" timestamp with time zone,
	"custo_fixo_mensal" numeric(14, 2),
	"faturamento_medio_mensal" numeric(14, 2),
	"custo_dinheiro_mensal_percentual" numeric(5, 2),
	"contingencia_padrao_percentual" numeric(5, 2) DEFAULT '3' NOT NULL,
	"perda_esperada_padrao_percentual" numeric(5, 2),
	"margem_minima_percentual" numeric(5, 2),
	"capital_disponivel_padrao" numeric(14, 2),
	"retorno_desejado_padrao_percentual" numeric(5, 2),
	"prazo_maximo_sem_caixa_dias" integer,
	"caixa_livre" numeric(14, 2),
	"credito_disponivel" numeric(14, 2),
	"estoque_atual_valor" numeric(14, 2),
	"capacidade_entrega_mensal" numeric(14, 2),
	"indices_balanco" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "perfil_financeiro_empresa_empresa_id_unique" UNIQUE("empresa_id")
);
--> statement-breakpoint
CREATE TABLE "viabilidade_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"quantidade_total" numeric(14, 4),
	"unidade" text,
	"cotacao_fornecedor_id" uuid,
	"custo_aquisicao_unitario" numeric(14, 4),
	"frete_total" numeric(14, 2),
	"numero_entregas" integer DEFAULT 1 NOT NULL,
	"armazenagem_total" numeric(14, 2),
	"mao_obra_total" numeric(14, 2),
	"prazo_pagamento_fornecedor_dias" integer,
	"prazo_recebimento_dias" integer,
	"forma_garantia" "forma_garantia" DEFAULT 'nenhuma' NOT NULL,
	"custo_garantia" numeric(14, 2),
	"valor_garantia_caucao" numeric(14, 2),
	"teto_edital" numeric(14, 2),
	"preco_ofertado_unitario" numeric(14, 4),
	"estoque_ja_disponivel_valor" numeric(14, 2),
	"perda_esperada_percentual" numeric(5, 2),
	"contingencia_percentual" numeric(5, 2),
	"margem_minima_percentual" numeric(5, 2),
	"aliquota_efetiva_percentual" numeric(5, 2),
	"capital_disponivel" numeric(14, 2),
	"retorno_desejado_percentual" numeric(5, 2),
	"cenario_conservador_fornecedor_percentual" numeric(5, 2) DEFAULT '10' NOT NULL,
	"cenario_conservador_prazo_percentual" numeric(5, 2) DEFAULT '50' NOT NULL,
	"cenario_conservador_perda_pontos_percentuais" numeric(5, 2) DEFAULT '2' NOT NULL,
	"preco_vencedor_unitario" numeric(14, 4),
	"resultado" jsonb,
	"ciencia_estouro_confirmada" boolean DEFAULT false NOT NULL,
	"ciencia_estouro_por_user_id" text,
	"ciencia_estouro_em" timestamp with time zone,
	"atualizado_por_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viabilidade_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "cotacao_fornecedor" ADD CONSTRAINT "cotacao_fornecedor_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_fornecedor" ADD CONSTRAINT "cotacao_fornecedor_criado_por_user_id_user_id_fk" FOREIGN KEY ("criado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_financeiro_empresa" ADD CONSTRAINT "perfil_financeiro_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfil_financeiro_empresa" ADD CONSTRAINT "perfil_financeiro_empresa_aliquota_informada_por_user_id_user_id_fk" FOREIGN KEY ("aliquota_informada_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viabilidade_participacao" ADD CONSTRAINT "viabilidade_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viabilidade_participacao" ADD CONSTRAINT "viabilidade_participacao_cotacao_fornecedor_id_cotacao_fornecedor_id_fk" FOREIGN KEY ("cotacao_fornecedor_id") REFERENCES "public"."cotacao_fornecedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viabilidade_participacao" ADD CONSTRAINT "viabilidade_participacao_ciencia_estouro_por_user_id_user_id_fk" FOREIGN KEY ("ciencia_estouro_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viabilidade_participacao" ADD CONSTRAINT "viabilidade_participacao_atualizado_por_user_id_user_id_fk" FOREIGN KEY ("atualizado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cotacao_fornecedor_empresa_id_idx" ON "cotacao_fornecedor" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cotacao_fornecedor_item_idx" ON "cotacao_fornecedor" USING btree ("item");