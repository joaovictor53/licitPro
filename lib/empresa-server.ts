// lib/empresa-server.ts
// Cadastro único de empresa (Fase 0 do LicitPro Análise). Usuários criados
// antes desta fase tinham razão social/CNPJ/endereço direto em `user` — a
// primeira leitura aqui copia esses dados uma única vez para `empresa`.

import { eq } from 'drizzle-orm';
import { db } from '@/app/src';
import { empresa, user } from '@/app/src/db/schema';

export async function obterOuCriarEmpresa(userId: string) {
    const [existente] = await db
        .select()
        .from(empresa)
        .where(eq(empresa.donoUserId, userId))
        .limit(1);

    if (existente) return existente;

    const [usuario] = await db
        .select({
            razaoSocial: user.razaoSocial,
            cnpj: user.cnpj,
            endereco: user.endereco,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    const [criada] = await db
        .insert(empresa)
        .values({
            donoUserId: userId,
            razaoSocial: usuario?.razaoSocial ?? null,
            cnpj: usuario?.cnpj ?? null,
            endereco: usuario?.endereco ?? null,
        })
        .onConflictDoNothing({ target: empresa.donoUserId })
        .returning();

    if (criada) return criada;

    // Corrida rara: outra requisição criou a linha entre o select e o insert.
    const [existenteAgora] = await db
        .select()
        .from(empresa)
        .where(eq(empresa.donoUserId, userId))
        .limit(1);

    return existenteAgora;
}
