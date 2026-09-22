// lib/classificacao-assinatura.ts
// Ferramenta 9 — classificação PADRÃO de método de assinatura por peça
// (Regras: "esta é a classificação padrão, o edital sempre prevalece").
//
// Só as duas peças que o próprio sistema gera (proposta comercial e
// planilha de preços) exigem assinatura do representante legal por padrão.
// Documentos do dossiê (certidões, balanço, atestado, contrato social) e
// exigências acessórias entram como "não requer" por padrão — nenhum dos
// tipos hoje cadastrados em TIPOS_DOCUMENTO_DOSSIE está na lista "ASSINA"
// do doc do produto (declarações e procuração/credenciamento não são tipos
// de documento do dossiê ainda). O operador pode sobrescrever por peça.

import { MetodoExigenciaAssinatura } from '@/types/assinatura-tipos'
import { PecaMontagem } from '@/types/proposta-tipos'

export const classificarMetodoExigidoPadrao = (peca: PecaMontagem): MetodoExigenciaAssinatura => {
  if (peca.origem === 'gerada' || peca.origem === 'Ferramenta 7') {
    return 'assinatura_representante_legal'
  }
  return 'nao_requer'
}
