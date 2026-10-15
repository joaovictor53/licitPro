CREATE TABLE "edital_pncp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_controle_pncp" text NOT NULL,
	"orgao_cnpj" text,
	"orgao" text,
	"municipio" text,
	"uf" text,
	"objeto" text,
	"valor_estimado" numeric(16, 2),
	"modalidade" text,
	"numero_processo" text,
	"data_abertura_proposta" timestamp with time zone,
	"data_encerramento_proposta" timestamp with time zone,
	"data_publicacao_pncp" timestamp with time zone,
	"link_origem" text,
	"primeira_coleta_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edital_pncp_numero_controle_pncp_unique" UNIQUE("numero_controle_pncp")
);
--> statement-breakpoint
CREATE TABLE "radar_varredura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fonte" text DEFAULT 'pncp' NOT NULL,
	"uf" text NOT NULL,
	"modalidade" integer NOT NULL,
	"data_inicial" text NOT NULL,
	"data_final" text NOT NULL,
	"status" text NOT NULL,
	"paginas_lidas" integer DEFAULT 0 NOT NULL,
	"total_paginas" integer,
	"total_registros" integer,
	"erro" text,
	"executado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "edital_pncp_uf_publicacao_idx" ON "edital_pncp" USING btree ("uf","data_publicacao_pncp");--> statement-breakpoint
CREATE UNIQUE INDEX "radar_varredura_chave_unique" ON "radar_varredura" USING btree ("fonte","uf","modalidade","data_inicial","data_final");