CREATE TYPE "public"."situacao_resultado_sessao" AS ENUM('vencedora_provisoria', 'classificada', 'desclassificada', 'inabilitada');--> statement-breakpoint
CREATE TABLE "convocacao_anexo_sessao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"data_hora_convocacao_em" timestamp with time zone NOT NULL,
	"prazo_limite_em" timestamp with time zone NOT NULL,
	"o_que_foi_solicitado" text NOT NULL,
	"atendido_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envio_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"prazo_final_envio_em" timestamp with time zone,
	"data_hora_envio_em" timestamp with time zone,
	"numero_protocolo" text,
	"comprovante_texto" text,
	"comprovante_arquivo_nome" text,
	"comprovante_arquivo_base64" text,
	"enviado_por_user_id" text,
	"observacao" text,
	"nao_enviada_motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "envio_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "registro_sessao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"horario_abertura_em" timestamp with time zone,
	"horario_encerramento_em" timestamp with time zone,
	"quantidade_participantes" integer,
	"lance_final_empresa" numeric(14, 2),
	"menor_lance_disputa" numeric(14, 2),
	"classificacao_obtida" text,
	"houve_negociacao" boolean DEFAULT false NOT NULL,
	"valor_negociado" numeric(14, 2),
	"valor_vencedor" numeric(14, 2),
	"ocorrencias" text,
	"anotacao_livre" text,
	"resultado_situacao" "situacao_resultado_sessao",
	"resultado_motivo" text,
	"registrado_por_user_id" text,
	"registrado_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registro_sessao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "convocacao_anexo_sessao" ADD CONSTRAINT "convocacao_anexo_sessao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio_participacao" ADD CONSTRAINT "envio_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio_participacao" ADD CONSTRAINT "envio_participacao_enviado_por_user_id_user_id_fk" FOREIGN KEY ("enviado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_sessao" ADD CONSTRAINT "registro_sessao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_sessao" ADD CONSTRAINT "registro_sessao_registrado_por_user_id_user_id_fk" FOREIGN KEY ("registrado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convocacao_anexo_sessao_participacao_id_idx" ON "convocacao_anexo_sessao" USING btree ("participacao_id");