CREATE TABLE "item_preco_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"descricao" text NOT NULL,
	"unidade" text,
	"quantidade" numeric(14, 4) DEFAULT '1' NOT NULL,
	"marca_modelo" text,
	"custo_unitario" numeric(14, 4),
	"piso_unitario" numeric(14, 4),
	"alvo_unitario" numeric(14, 4),
	"teto_unitario" numeric(14, 4),
	"preco_ofertado" numeric(14, 4),
	"preco_definido_por_user_id" text,
	"preco_definido_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versao_planilha_precos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"arquivo_nome" text NOT NULL,
	"arquivo_base64" text NOT NULL,
	"usou_modelo_edital" boolean DEFAULT false NOT NULL,
	"snapshot_itens" jsonb NOT NULL,
	"totais" jsonb NOT NULL,
	"gerado_por_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versao_proposta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"arquivo_nome" text NOT NULL,
	"arquivo_base64" text NOT NULL,
	"pecas" jsonb NOT NULL,
	"checagem" jsonb NOT NULL,
	"aprovada" boolean DEFAULT false NOT NULL,
	"gerado_por_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_preco_participacao" ADD CONSTRAINT "item_preco_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_preco_participacao" ADD CONSTRAINT "item_preco_participacao_preco_definido_por_user_id_user_id_fk" FOREIGN KEY ("preco_definido_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_planilha_precos" ADD CONSTRAINT "versao_planilha_precos_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_planilha_precos" ADD CONSTRAINT "versao_planilha_precos_gerado_por_user_id_user_id_fk" FOREIGN KEY ("gerado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_proposta" ADD CONSTRAINT "versao_proposta_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_proposta" ADD CONSTRAINT "versao_proposta_gerado_por_user_id_user_id_fk" FOREIGN KEY ("gerado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_preco_participacao_participacao_id_idx" ON "item_preco_participacao" USING btree ("participacao_id");--> statement-breakpoint
CREATE INDEX "versao_planilha_precos_participacao_id_idx" ON "versao_planilha_precos" USING btree ("participacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "versao_planilha_precos_participacao_versao_unique" ON "versao_planilha_precos" USING btree ("participacao_id","versao");--> statement-breakpoint
CREATE INDEX "versao_proposta_participacao_id_idx" ON "versao_proposta" USING btree ("participacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "versao_proposta_participacao_versao_unique" ON "versao_proposta" USING btree ("participacao_id","versao");