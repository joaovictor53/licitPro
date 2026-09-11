CREATE TYPE "public"."esfera" AS ENUM('federal', 'estadual', 'municipal', 'privado');--> statement-breakpoint
CREATE TYPE "public"."estado_participacao" AS ENUM('identificada', 'em_triagem', 'descartada', 'em_analise_profunda', 'aguardando_documentos', 'aguardando_cotacao', 'em_composicao_de_preco', 'em_elaboracao', 'aguardando_aprovacao', 'aguardando_assinatura', 'pronta_para_envio', 'enviada', 'suspensa', 'em_disputa', 'em_habilitacao', 'habilitada', 'inabilitada', 'vencedora_provisoria', 'adjudicada', 'homologada', 'contratada', 'encerrada');--> statement-breakpoint
CREATE TYPE "public"."porte_empresa" AS ENUM('mei', 'me', 'epp', 'demais', 'nao_informado');--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dono_user_id" text NOT NULL,
	"razao_social" text,
	"nome_fantasia" text,
	"cnpj" text,
	"cnae_principal" text,
	"cnaes_secundarios" text[],
	"porte" "porte_empresa",
	"elegibilidade_tratamento_favorecido" boolean,
	"regime_tributario" text,
	"endereco" text,
	"certificado_icp_brasil_valido" boolean,
	"representante_legal" jsonb,
	"identidade_visual" jsonb,
	"impedimentos_sancoes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_dono_user_id_unique" UNIQUE("dono_user_id")
);
--> statement-breakpoint
CREATE TABLE "participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"criado_por_user_id" text NOT NULL,
	"estado" "estado_participacao" DEFAULT 'identificada' NOT NULL,
	"numero_controle_pncp" text,
	"orgao" text NOT NULL,
	"municipio" text,
	"uf" text,
	"esfera" "esfera",
	"objeto" text NOT NULL,
	"modalidade" text,
	"numero_processo" text,
	"plataforma" text,
	"valor_estimado" numeric(14, 2),
	"data_sessao_em" timestamp with time zone,
	"fuso_edital" text,
	"link_edital" text,
	"link_portal_origem" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_dono_user_id_user_id_fk" FOREIGN KEY ("dono_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_criado_por_user_id_user_id_fk" FOREIGN KEY ("criado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participacao_empresa_id_idx" ON "participacao" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "participacao_estado_idx" ON "participacao" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "participacao_data_sessao_idx" ON "participacao" USING btree ("data_sessao_em");