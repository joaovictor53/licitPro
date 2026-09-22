CREATE TYPE "public"."estado_recurso_fase" AS ENUM('sem_evento', 'evento_identificado', 'aguardando_decisao_interna', 'intencao_pendente', 'intencao_registrada', 'prazo_razoes_em_curso', 'razoes_protocoladas', 'aguardando_contrarrazoes', 'contrarrazoes_recebidas', 'decisao_recebida', 'acolhido', 'rejeitado', 'prazo_perdido', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."resultado_decisao_recursal" AS ENUM('acolhido', 'rejeitado', 'parcialmente_acolhido');--> statement-breakpoint
CREATE TYPE "public"."resultado_habilitacao" AS ENUM('habilitada', 'inabilitada', 'em_diligencia');--> statement-breakpoint
CREATE TABLE "convocacao_pregoeiro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"data_hora_convocacao_em" timestamp with time zone NOT NULL,
	"prazo_limite_em" timestamp with time zone NOT NULL,
	"o_que_foi_solicitado" text NOT NULL,
	"onde_enviar" text,
	"atendido_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diligencia_habilitacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"o_que_foi_questionado" text NOT NULL,
	"prazo_resposta_em" timestamp with time zone NOT NULL,
	"resposta_enviada_em" timestamp with time zone,
	"documento_complementar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habilitacao_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"resultado" "resultado_habilitacao",
	"motivo_inabilitacao" text,
	"registrado_por_user_id" text,
	"registrado_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "habilitacao_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "recurso_proprio_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"ato_recorrido" text NOT NULL,
	"data_hora_ato_em" timestamp with time zone NOT NULL,
	"prazo_intencao_em" timestamp with time zone,
	"intencao_registrada_em" timestamp with time zone,
	"intencao_alegacao" text,
	"prazo_razoes_em" timestamp with time zone,
	"razoes_protocolo_numero" text,
	"razoes_arquivo_nome" text,
	"razoes_arquivo_base64" text,
	"razoes_protocolado_em" timestamp with time zone,
	"decisao_resultado" "resultado_decisao_recursal",
	"decisao_em" timestamp with time zone,
	"decisao_arquivo_nome" text,
	"decisao_arquivo_base64" text,
	"estado" "estado_recurso_fase" DEFAULT 'evento_identificado' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurso_terceiro_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"quem" text NOT NULL,
	"contra_o_que" text NOT NULL,
	"data_identificacao_em" timestamp with time zone NOT NULL,
	"prazo_contrarrazoes_em" timestamp with time zone,
	"contrarrazoes_protocolo_numero" text,
	"contrarrazoes_arquivo_nome" text,
	"contrarrazoes_arquivo_base64" text,
	"contrarrazoes_protocolado_em" timestamp with time zone,
	"decisao_resultado" "resultado_decisao_recursal",
	"decisao_em" timestamp with time zone,
	"estado" "estado_recurso_fase" DEFAULT 'evento_identificado' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regularizacao_me_epp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"data_declaracao_vencedora_em" timestamp with time zone NOT NULL,
	"prazo_dias_uteis" integer DEFAULT 5 NOT NULL,
	"prorrogacao_dias" integer,
	"documento_pendente" text,
	"protocolo_evidencia" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regularizacao_me_epp_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "convocacao_pregoeiro" ADD CONSTRAINT "convocacao_pregoeiro_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diligencia_habilitacao" ADD CONSTRAINT "diligencia_habilitacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacao_participacao" ADD CONSTRAINT "habilitacao_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacao_participacao" ADD CONSTRAINT "habilitacao_participacao_registrado_por_user_id_user_id_fk" FOREIGN KEY ("registrado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurso_proprio_participacao" ADD CONSTRAINT "recurso_proprio_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurso_terceiro_participacao" ADD CONSTRAINT "recurso_terceiro_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regularizacao_me_epp" ADD CONSTRAINT "regularizacao_me_epp_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convocacao_pregoeiro_participacao_id_idx" ON "convocacao_pregoeiro" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "diligencia_habilitacao_participacao_id_idx" ON "diligencia_habilitacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "recurso_proprio_participacao_participacao_id_idx" ON "recurso_proprio_participacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "recurso_terceiro_participacao_participacao_id_idx" ON "recurso_terceiro_participacao" USING btree ("participacao_id");