CREATE TABLE "analise_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"resumo" text NOT NULL,
	"nao_conformidades" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analise_cache_hash_unique" UNIQUE("hash")
);
