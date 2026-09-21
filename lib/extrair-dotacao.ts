// lib/extrair-dotacao.ts
// Ferramenta 2, Ficha do Recurso — "O que o sistema já traz preenchido":
// ao baixar o edital, procura a dotação orçamentária (programa de trabalho,
// fonte de recurso, elemento de despesa, menção a convênio/emenda/repasse)
// e traz o que encontrar, com página e trecho. Campo não encontrado fica
// vazio e marcado como não localizado — a IA nunca inventa esses dados.
//
// Reaproveita os mesmos helpers de blocagem/chamada à Groq e a camada
// anti-alucinação usados pela Leitura do Edital (lib/leitura-edital.ts).

import Groq from 'groq-sdk'
import { chamarGroqComRetry, evidenciaTemRespaldo, extrairSecoesCriticas, normalizarParaComparacao } from '@/lib/texto-blocos'
import { CampoDotacao, DotacaoOrcamentaria } from '@/types/recurso-tipos'

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras e em execução orçamentária pública (Lei nº 4.320/1964).

Você receberá um trecho do edital de uma licitação, filtrado para as partes que mencionam orçamento e recurso financeiro. Sua tarefa é localizar, se existirem, estes quatro dados:

1. Programa de trabalho
2. Fonte de recurso
3. Elemento de despesa
4. Menção a convênio, emenda parlamentar ou repasse (se houver, transcreva a menção)

REGRAS OBRIGATÓRIAS:
- Só preencha um campo se ele aparecer literalmente no texto. Não infira, não calcule, não complete com conhecimento geral.
- "trecho" é uma transcrição literal do texto (nunca um resumo) — é a prova de que o dado existe no edital.
- "pagina" é o número inteiro da página, pela marcação "[[PÁGINA N]]" mais próxima do trecho. Use null se não for identificável.
- Se um dado não aparecer no texto, use null em "valor", "trecho" e "pagina" para aquele campo — não invente.

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, EXATAMENTE neste formato:

{
  "programa_trabalho": { "valor": "texto ou null", "trecho": "citação literal ou null", "pagina": 3 },
  "fonte_recurso": { "valor": "texto ou null", "trecho": "citação literal ou null", "pagina": null },
  "elemento_despesa": { "valor": "texto ou null", "trecho": "citação literal ou null", "pagina": null },
  "mencao_convenio_emenda_repasse": { "valor": "texto ou null", "trecho": "citação literal ou null", "pagina": null }
}`

const PALAVRAS_CHAVE_DOTACAO = [
  'dotação orçamentária', 'dotação', 'programa de trabalho', 'fonte de recurso', 'fonte:',
  'elemento de despesa', 'natureza da despesa', 'classificação orçamentária', 'ficha orçamentária',
  'recurso próprio', 'recursos próprios', 'convênio', 'termo de convênio', 'emenda parlamentar',
  'emenda impositiva', 'contrato de repasse', 'repasse', 'transferegov', 'siconv', '+brasil',
]

const LIMITE_TEXTO_FILTRADO = 4_000

const CAMPO_VAZIO: CampoDotacao = { valor: null, trecho: null, pagina: null }

type CampoBruto = { valor?: unknown; trecho?: unknown; pagina?: unknown } | null | undefined

const normalizarCampo = (bruto: CampoBruto, textoNormalizado: string): CampoDotacao => {
  if (!bruto || typeof bruto.valor !== 'string' || !bruto.valor.trim()) return CAMPO_VAZIO
  if (typeof bruto.trecho !== 'string' || !bruto.trecho.trim()) return CAMPO_VAZIO

  // Mesmo princípio anti-alucinação da Leitura do Edital: se o trecho citado
  // não existe de fato no texto do edital, descartamos o campo em vez de
  // apresentar um dado extraído sem lastro.
  if (!evidenciaTemRespaldo(bruto.trecho, textoNormalizado)) return CAMPO_VAZIO

  return {
    valor: bruto.valor.trim(),
    trecho: bruto.trecho.trim(),
    pagina: typeof bruto.pagina === 'number' ? bruto.pagina : null,
  }
}

export const extrairDotacaoOrcamentaria = async (textoEdital: string): Promise<DotacaoOrcamentaria> => {
  const editalFiltrado = extrairSecoesCriticas(textoEdital, PALAVRAS_CHAVE_DOTACAO, LIMITE_TEXTO_FILTRADO)
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const rawText = await chamarGroqComRetry(groq, {
    model: 'openai/gpt-oss-120b',
    maxTokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `=== TRECHOS DO EDITAL SOBRE ORÇAMENTO ===\n${editalFiltrado}\n\nExtraia a dotação orçamentária em JSON.` },
    ],
  })

  const parsed = JSON.parse(rawText) as {
    programa_trabalho?: CampoBruto
    fonte_recurso?: CampoBruto
    elemento_despesa?: CampoBruto
    mencao_convenio_emenda_repasse?: CampoBruto
  }

  const textoNormalizado = normalizarParaComparacao(textoEdital)

  return {
    programaTrabalho: normalizarCampo(parsed.programa_trabalho, textoNormalizado),
    fonteRecurso: normalizarCampo(parsed.fonte_recurso, textoNormalizado),
    elementoDespesa: normalizarCampo(parsed.elemento_despesa, textoNormalizado),
    mencaoConvenioEmendaRepasse: normalizarCampo(parsed.mencao_convenio_emenda_repasse, textoNormalizado),
  }
}
