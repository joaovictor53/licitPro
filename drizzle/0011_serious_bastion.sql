CREATE TYPE "public"."situacao_checklist" AS ENUM('ok', 'vence_antes', 'faltando', 'nao_confere', 'a_verificar');--> statement-breakpoint
CREATE TYPE "public"."status_acessoria" AS ENUM('pendente', 'cumprida');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento_dossie" AS ENUM('certidao_federal', 'certidao_estadual', 'certidao_municipal', 'fgts', 'trabalhista', 'contrato_social', 'balanco_patrimonial', 'atestado_capacidade_tecnica', 'alvara_funcionamento', 'inscricao_estadual', 'inscricao_municipal', 'outro');--> statement-breakpoint
CREATE TABLE "acessoria_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"exigencia_edital_id" uuid NOT NULL,
	"status" "status_acessoria" DEFAULT 'pendente' NOT NULL,
	"prazo_limite_em" timestamp with time zone,
	"custo_estimado" numeric(14, 2),
	"responsavel" text,
	"comprovante" text,
	"justificativa" text,
	"marcado_por_user_id" text,
	"marcado_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "acessoria_participacao_exigencia_edital_id_unique" UNIQUE("exigencia_edital_id")
);
--> statement-breakpoint
CREATE TABLE "checklist_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"exigencia_edital_id" uuid NOT NULL,
	"documento_empresa_id" uuid,
	"situacao" "situacao_checklist" DEFAULT 'a_verificar' NOT NULL,
	"marco_validado_contra" text,
	"marco_data_em" timestamp with time zone,
	"vinculado_automaticamente" boolean DEFAULT false NOT NULL,
	"vinculado_por_user_id" text,
	"vinculado_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checklist_participacao_exigencia_edital_id_unique" UNIQUE("exigencia_edital_id")
);
--> statement-breakpoint
CREATE TABLE "documento_empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_documento_dossie" NOT NULL,
	"nome" text NOT NULL,
	"numero" text,
	"validade_em" timestamp with time zone,
	"evidencia" text,
	"dados_balanco" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"substitui_documento_id" uuid,
	"criado_por_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acessoria_participacao" ADD CONSTRAINT "acessoria_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessoria_participacao" ADD CONSTRAINT "acessoria_participacao_exigencia_edital_id_exigencia_edital_id_fk" FOREIGN KEY ("exigencia_edital_id") REFERENCES "public"."exigencia_edital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessoria_participacao" ADD CONSTRAINT "acessoria_participacao_marcado_por_user_id_user_id_fk" FOREIGN KEY ("marcado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_participacao" ADD CONSTRAINT "checklist_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_participacao" ADD CONSTRAINT "checklist_participacao_exigencia_edital_id_exigencia_edital_id_fk" FOREIGN KEY ("exigencia_edital_id") REFERENCES "public"."exigencia_edital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_participacao" ADD CONSTRAINT "checklist_participacao_documento_empresa_id_documento_empresa_id_fk" FOREIGN KEY ("documento_empresa_id") REFERENCES "public"."documento_empresa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_participacao" ADD CONSTRAINT "checklist_participacao_vinculado_por_user_id_user_id_fk" FOREIGN KEY ("vinculado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_empresa" ADD CONSTRAINT "documento_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_empresa" ADD CONSTRAINT "documento_empresa_substitui_documento_id_documento_empresa_id_fk" FOREIGN KEY ("substitui_documento_id") REFERENCES "public"."documento_empresa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_empresa" ADD CONSTRAINT "documento_empresa_criado_por_user_id_user_id_fk" FOREIGN KEY ("criado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acessoria_participacao_participacao_id_idx" ON "acessoria_participacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "checklist_participacao_participacao_id_idx" ON "checklist_participacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "checklist_participacao_situacao_idx" ON "checklist_participacao" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX "documento_empresa_empresa_id_idx" ON "documento_empresa" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "documento_empresa_tipo_idx" ON "documento_empresa" USING btree ("tipo");