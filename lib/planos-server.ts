// lib/planos-server.ts
// Verificação de cota dos planos 

import { and, count, eq, gte } from 'drizzle-orm';
import { db } from '@/app/src';
import { analise } from '@/app/src/db/schema';
import {
    PLANOS,
    PLANO_PADRAO,
    ehPlanoValido,
    type PlanoId,
    type StatusPlano,
} from '@/lib/planos';

export async function obterStatusPlano(
    userId: string,
    planoBruto: string | null | undefined,
    trialExpiresAt: Date | string | null | undefined,
    role?: string | null
): Promise<StatusPlano> {
    const plano: PlanoId = ehPlanoValido(planoBruto) ? planoBruto : PLANO_PADRAO;
    const config = PLANOS[plano];
    const limite = config.limiteAnalises;

    if (role === 'admin') {
        return {
            plano,
            nomePlano: 'Administrador',
            limite: 0,
            usadas: 0,
            restantes: 0,
            permitido: true,
            motivo: null,
            ilimitado: true,
            trialExpiresAt: null,
        };
    }

    const trial = trialExpiresAt ? new Date(trialExpiresAt) : null;

    if (plano === 'gratis' && trial && trial.getTime() < Date.now()) {
        return {
            plano,
            nomePlano: config.nome,
            limite,
            usadas: limite,
            restantes: 0,
            permitido: false,
            motivo: 'trial_expirado',
            ilimitado: false,
            trialExpiresAt: trial,
        };
    }

    // Grátis conta o total de análises; pagos contam apenas o mês corrente
    const agora = new Date();
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const filtro =
        plano === 'gratis'
            ? eq(analise.userId, userId)
            : and(eq(analise.userId, userId), gte(analise.createdAt, inicioDoMes));

    const [{ total: usadas }] = await db
        .select({ total: count() })
        .from(analise)
        .where(filtro);

    const restantes = Math.max(0, limite - usadas);

    return {
        plano,
        nomePlano: config.nome,
        limite,
        usadas,
        restantes,
        permitido: restantes > 0,
        motivo: restantes > 0 ? null : 'limite_atingido',
        ilimitado: false,
        trialExpiresAt: plano === 'gratis' ? trial : null,
    };
}
