CREATE TABLE "cnae_por_objeto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnae" text NOT NULL,
	"descricao" text,
	"busca" text[] NOT NULL,
	"nao_traz" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cnae_por_objeto_cnae_unique" UNIQUE("cnae")
);
--> statement-breakpoint
CREATE TABLE "radar_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"modo_busca" text DEFAULT 'cnae' NOT NULL,
	"esfera" "esfera",
	"estados" text[] DEFAULT '{}' NOT NULL,
	"orgaos_incluir" text[] DEFAULT '{}' NOT NULL,
	"orgaos_excluir" text[] DEFAULT '{}' NOT NULL,
	"texto_livre" text,
	"faixa_valor_min" numeric(14, 2),
	"faixa_valor_max" numeric(14, 2),
	"ativo" boolean DEFAULT false NOT NULL,
	"ultima_execucao_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "radar_config_empresa_id_unique" UNIQUE("empresa_id")
);
--> statement-breakpoint
ALTER TABLE "participacao" ADD COLUMN "analisado_por_user_id" text;--> statement-breakpoint
ALTER TABLE "participacao" ADD COLUMN "analisado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "radar_config" ADD CONSTRAINT "radar_config_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_analisado_por_user_id_user_id_fk" FOREIGN KEY ("analisado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participacao_empresa_pncp_unique" ON "participacao" USING btree ("empresa_id","numero_controle_pncp");