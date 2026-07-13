// lib/planos.ts
// Configuração central dos planos de assinatura do LicitPro.
// Este módulo é puro (sem acesso a banco) e pode ser importado no client.
// A verificação de cota fica em lib/planos-server.ts.

export const PLANOS = {
    gratis: {
        nome: 'Grátis',
        descricao: 'Experimente o LicitPro por 2 dias',
        limiteAnalises: 1,
        duracaoDias: 2,
        preco: null as number | null,
    },
    basico: {
        nome: 'Básico',
        descricao: 'Para quem participa de licitações pontuais',
        limiteAnalises: 8,
        duracaoDias: null as number | null,
        preco: null as number | null,
    },
    profissional: {
        nome: 'Profissional',
        descricao: 'Para empresas ativas em licitações',
        limiteAnalises: 20,
        duracaoDias: null as number | null,
        preco: null as number | null,
    },
    empresarial: {
        nome: 'Empresarial',
        descricao: 'Para alto volume de disputas',
        limiteAnalises: 100,
        duracaoDias: null as number | null,
        preco: null as number | null,
    },
} as const;

export type PlanoId = keyof typeof PLANOS;

export const PLANO_PADRAO: PlanoId = 'gratis';

export function ehPlanoValido(valor: unknown): valor is PlanoId {
    return typeof valor === 'string' && valor in PLANOS;
}

export interface StatusPlano {
    plano: PlanoId;
    nomePlano: string;
    limite: number;
    usadas: number;
    restantes: number;
    permitido: boolean;
    /** Motivo do bloqueio quando permitido === false */
    motivo: 'trial_expirado' | 'limite_atingido' | null;
    /** Admins não têm limite de análises */
    ilimitado: boolean;
    /** Fim do período de teste (apenas plano grátis) */
    trialExpiresAt: Date | null;
}
