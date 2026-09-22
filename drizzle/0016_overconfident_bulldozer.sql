CREATE TABLE "plataforma_compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tamanho_maximo_mb" integer,
	"formatos_aceitos" text[] DEFAULT '{}' NOT NULL,
	"aceita_zip" boolean,
	"exige_arquivo_separado" boolean DEFAULT true NOT NULL,
	"regras_nomenclatura" text,
	"resolucao_minima" text,
	"observacoes" text,
	"ultima_conferencia_em" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plataforma_compra_nome_unique" UNIQUE("nome")
);
