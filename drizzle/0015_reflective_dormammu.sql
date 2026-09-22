CREATE TYPE "public"."metodo_assinatura_usado" AS ENUM('gov_br', 'icp_brasil', 'outro');--> statement-breakpoint
CREATE TYPE "public"."metodo_exigencia_assinatura" AS ENUM('nao_requer', 'assinatura_representante_legal', 'assinatura_eletronica_aceita', 'icp_brasil_exigida', 'assinatura_portal', 'reconhecimento_firma', 'autenticacao_copia', 'apresentacao_original');--> statement-breakpoint
CREATE TYPE "public"."status_aprovacao_proposta" AS ENUM('aguardando', 'aprovada', 'devolvida', 'recusada');--> statement-breakpoint
CREATE TYPE "public"."status_assinatura_peca" AS ENUM('pendente', 'assinado');--> statement-breakpoint
CREATE TABLE "aprovacao_proposta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"versao_proposta_id" uuid NOT NULL,
	"status" "status_aprovacao_proposta" DEFAULT 'aguardando' NOT NULL,
	"observacao" text,
	"motivo_recusa" text,
	"decidido_por_user_id" text,
	"decidido_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aprovacao_proposta_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
CREATE TABLE "assinatura_peca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"peca" text NOT NULL,
	"metodo_exigido" "metodo_exigencia_assinatura" DEFAULT 'nao_requer' NOT NULL,
	"metodo_exigido_sobrescrito_por_user_id" text,
	"status" "status_assinatura_peca" DEFAULT 'pendente' NOT NULL,
	"assinado_por_nome" text,
	"assinado_em" timestamp with time zone,
	"metodo_usado" "metodo_assinatura_usado",
	"link_validacao" text,
	"arquivo_assinado_nome" text,
	"arquivo_assinado_base64" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aprovacao_proposta" ADD CONSTRAINT "aprovacao_proposta_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao_proposta" ADD CONSTRAINT "aprovacao_proposta_versao_proposta_id_versao_proposta_id_fk" FOREIGN KEY ("versao_proposta_id") REFERENCES "public"."versao_proposta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao_proposta" ADD CONSTRAINT "aprovacao_proposta_decidido_por_user_id_user_id_fk" FOREIGN KEY ("decidido_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura_peca" ADD CONSTRAINT "assinatura_peca_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura_peca" ADD CONSTRAINT "assinatura_peca_metodo_exigido_sobrescrito_por_user_id_user_id_fk" FOREIGN KEY ("metodo_exigido_sobrescrito_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assinatura_peca_participacao_id_idx" ON "assinatura_peca" USING btree ("participacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assinatura_peca_participacao_peca_unique" ON "assinatura_peca" USING btree ("participacao_id","peca");