CREATE TABLE "condicoes_proposta_participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"valores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"atualizado_por_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "condicoes_proposta_participacao_participacao_id_unique" UNIQUE("participacao_id")
);
--> statement-breakpoint
ALTER TABLE "condicoes_proposta_participacao" ADD CONSTRAINT "condicoes_proposta_participacao_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condicoes_proposta_participacao" ADD CONSTRAINT "condicoes_proposta_participacao_atualizado_por_user_id_user_id_fk" FOREIGN KEY ("atualizado_por_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;