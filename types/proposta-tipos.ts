// types/proposta-tipos.ts
// Ferramenta 8, Montagem da Proposta.
//
// Decisão de escopo: sem extração estruturada de anexos-modelo do edital
// (a Ferramenta 3 identifica exigências, não formulários anexos completos)
// e sem gerador de DOCX no projeto — por isso a "peça" gerada aqui é um
// resumo em PDF (dados da empresa, do edital, itens/preços e condições),
// não o preenchimento automático de cada anexo oficial. Anexos do dossiê
// (certidões, atestados, balanço) entram na lista de montagem por vínculo,
// não por upload — mesma limitação já documentada na Preparação Documental.

export const SITUACOES_PECA_MONTAGEM = ['pronta', 'preencher', 'vinculada', 'faltando', 'vence_antes_sessao'] as const
export type SituacaoPecaMontagem = (typeof SITUACOES_PECA_MONTAGEM)[number]

export interface PecaMontagem {
  peca: string
  origem: string
  situacao: SituacaoPecaMontagem
  detalhe?: string
}

export interface ChecagemFinalProposta {
  podeGerar: boolean
  pendencias: string[]
}

export interface AgregadoMontagemProposta {
  pecas: PecaMontagem[]
  checagem: ChecagemFinalProposta
}
