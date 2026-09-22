CREATE TYPE "public"."decisao_participacao_tipo" AS ENUM('participar', 'nao_participar', 'adiar');--> statement-breakpoint
CREATE TYPE "public"."motivo_nao_participar" AS ENUM('fora_do_ramo', 'valor_abaixo_do_minimo', 'valor_acima_da_capacidade', 'margem_insuficiente', 'retorno_abaixo_do_pretendido', 'prazo_inexequivel', 'exigencia_que_a_empresa_nao_atende', 'risco_de_recebimento', 'falta_de_caixa', 'prazo_curto_demais_para_preparar', 'outro');--> statement-breakpoint
CREATE TYPE "public"."status_aprovacao_empresa" AS ENUM('nao_enviada', 'aguardando', 'aprovada', 'recusada');--> statement-breakpoint
CREATE TABLE "decisao_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"decisao" "decisao_participacao_tipo" NOT NULL,
	"motivo_nao_participar" "motivo_nao_participar",
	"motivo_outro" text,
	"data_retomada_em" timestamp with time zone,
	"alertas_ativos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ciencia_alerta_confirmada" boolean DEFAULT false NOT NULL,
	"numeros_congelados" jsonb NOT NULL,
	"aprovacao_status" "status_aprovacao_empresa" DEFAULT 'nao_enviada' NOT NULL,
	"aprovacao_observacao" text,
	"aprovacao_registrada_por_user_id" text,
	"aprovacao_registrada_em" timestamp with time zone,
	"decidido_por_user_id" text NOT NULL,
	"decidido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "decisao_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "decisao_participacao" ADD CONSTRAINT "decisao_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisao_participacao" ADD CONSTRAINT "decisao_participacao_aprovacao_registrada_por_user_id_user_id_fk" FOREIGN KEY ("aprovacao_registrada_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisao_participacao" ADD CONSTRAINT "decisao_participacao_decidido_por_user_id_user_id_fk" FOREIGN KEY ("decidido_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;