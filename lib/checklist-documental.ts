// lib/checklist-documental.ts
// Ferramenta 6, Preparação Documental.
//
// Duas responsabilidades sem IA (cálculo determinístico, não julgamento):
// 1. Sugerir a qual documento do dossiê uma exigência de habilitação
//    provavelmente se refere, por palavra-chave — é só uma sugestão, o
//    vínculo automático nasce sempre 'a_verificar' até confirmação humana
//    (mesmo princípio da Regra Geral 5, aplicado ao vínculo em vez de ao
//    conteúdo da exigência).
// 2. Calcular a situação (ok/vence_antes/faltando/nao_confere) a partir de
//    datas e dos campos do balanço patrimonial — isso é aritmética, não
//    conclusão da IA, por isso pode ser aplicado direto quando o vínculo já
//    foi confirmado por um humano (manual ou após confirmação do sugerido).

import { DadosBalancoPatrimonial, SituacaoChecklist, TipoDocumentoDossie } from '@/types/documento-tipos'

interface DocumentoParaMatch {
  id: string
  tipo: TipoDocumentoDossie
  nome: string
}

// Palavras-chave (minúsculas, sem acento) que costumam aparecer no título ou
// na descrição de uma exigência de habilitação, por tipo de documento do
// dossiê. Cobre os documentos mais comuns citados no doc do produto — cresce
// conforme aparecem casos novos, mesmo princípio da tabela CNAE por objeto.
const PALAVRAS_POR_TIPO: Record<TipoDocumentoDossie, string[]> = {
  certidao_federal: ['certidao negativa federal', 'cnd federal', 'receita federal', 'tributos federais', 'divida ativa da uniao'],
  certidao_estadual: ['certidao negativa estadual', 'fazenda estadual', 'tributos estaduais'],
  certidao_municipal: ['certidao negativa municipal', 'fazenda municipal', 'tributos municipais'],
  fgts: ['fgts', 'fundo de garantia'],
  trabalhista: ['cndt', 'certidao negativa de debitos trabalhistas', 'justica do trabalho'],
  contrato_social: ['contrato social', 'estatuto social', 'ato constitutivo'],
  balanco_patrimonial: ['balanco patrimonial', 'demonstracao contabil', 'demonstracoes contabeis'],
  atestado_capacidade_tecnica: ['atestado de capacidade tecnica', 'atestado tecnico', 'capacidade tecnica'],
  alvara_funcionamento: ['alvara de funcionamento', 'alvara municipal'],
  inscricao_estadual: ['inscricao estadual'],
  inscricao_municipal: ['inscricao municipal', 'cadastro municipal'],
  outro: [],
}

const semAcento = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Sugere um documento do dossiê para uma exigência, por palavra-chave. Retorna null se nada bater. */
export const sugerirDocumentoParaExigencia = (
  textoExigencia: string,
  documentos: DocumentoParaMatch[]
): DocumentoParaMatch | null => {
  const textoNormalizado = semAcento(textoExigencia)

  for (const documento of documentos) {
    const palavras = PALAVRAS_POR_TIPO[documento.tipo]
    if (palavras.some((palavra) => textoNormalizado.includes(palavra))) {
      return documento
    }
  }
  return null
}

export interface DocumentoParaSituacao {
  tipo: TipoDocumentoDossie
  validadeEm: Date | null
  dadosBalanco: DadosBalancoPatrimonial | null
}

/** Balanço sem os quatro campos da Junta Comercial nunca atende — regra explícita da Ferramenta 6. */
const balancoIncompleto = (dados: DadosBalancoPatrimonial | null): boolean =>
  !dados?.registroJuntaComercial || !dados.dataRegistroEm || !dados.exercicio || !dados.certidaoAnexada

export const calcularSituacaoChecklist = (
  documento: DocumentoParaSituacao | null,
  marcoDataEm: Date | null
): SituacaoChecklist => {
  if (!documento) return 'faltando'
  if (documento.tipo === 'balanco_patrimonial' && balancoIncompleto(documento.dadosBalanco)) return 'nao_confere'
  if (!documento.validadeEm) return 'ok'

  const referencia = marcoDataEm && marcoDataEm.getTime() > Date.now() ? marcoDataEm : new Date()
  return documento.validadeEm.getTime() < referencia.getTime() ? 'vence_antes' : 'ok'
}
