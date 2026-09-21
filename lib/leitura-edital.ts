// lib/leitura-edital.ts
// Ferramenta 3, Leitura do Edital — LicitPro_Analise_Ferramentas.md.
//
// Escopo desta primeira versão ("leitura padrão" do doc): o que desclassifica
// a proposta, o que inabilita a empresa, exigências de habilitação com
// critério, objeto/especificação e prazos/datas. O restante (marca/modelo
// detalhado, condições comerciais, anexos-modelo etc — botão "Aprofundar" do
// doc) fica para depois.
//
// Reaproveita a extração de PDF/OCR e os helpers de blocagem de texto e
// chamada à Groq já usados pelo Analyzer (lib/processar-pdf-servidor.ts,
// lib/texto-blocos.ts) — mesmo princípio de map-reduce para editais grandes.

import Groq from 'groq-sdk'
import {
  chamarGroqComRetry,
  dividirEmBlocosSequenciais,
  ehPlaceholderSemCitacao,
  evidenciaTemRespaldo,
  executarComConcorrenciaLimitada,
  extrairSecoesCriticas,
  normalizarParaComparacao,
} from '@/lib/texto-blocos'
import { ExigenciaExtraida, RiscoExigencia, TipoExigencia } from '@/types/edital-tipos'

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021, da Lei nº 8.666/1993 e da Lei Complementar nº 123/2006.

Você receberá o texto de um EDITAL de licitação (ou um trecho dele, se for muito extenso). Sua tarefa é montar a MATRIZ DE CONFORMIDADE: uma lista de exigências do edital, cada uma com onde está, o que exige e o risco de não atender.

Escopo desta leitura (não vá além disso):
- O que desclassifica a proposta
- O que inabilita a empresa
- Exigências de habilitação (jurídica, fiscal, econômico-financeira, técnica), com o critério objetivo de cada uma
- Objeto e especificação de cada item ou lote
- Prazos e datas (envio de proposta, sessão, validade da proposta, entrega, vigência)

O texto vem marcado com trechos no formato "[Página N]" indicando de qual página do PDF cada passagem foi extraída. Use SEMPRE essas marcações para a página exata de cada exigência.

REGRAS OBRIGATÓRIAS:
1. Cada exigência deve citar o número do item/cláusula do edital quando existir (ex: "8.3.2", "Anexo I, item 4"), em "clausula". Use null se não houver numeração clara.
2. "trecho" é uma TRANSCRIÇÃO LITERAL do edital (entre aspas no texto, copiado sem alterações) — nunca um resumo. É dessa transcrição que vem a prova de que a exigência existe.
3. "pagina" é o número inteiro da página de onde saiu o trecho, pela marcação "[Página N]" mais próxima. Use null só se realmente não for identificável.
4. A IA EXTRAI a exigência, NUNCA conclui se a empresa atende — não existe campo de "atende/não atende" nesta extração, isso é decidido depois por humano.
5. "risco": "desclassifica" (afeta a proposta/preço/especificação), "inabilita" (afeta habilitação jurídica/fiscal/técnica/econômica), ou "sanavel" (formalidade menor, corrigível por diligência, art. 64 da Lei 14.133/2021).
6. "tipo": "habilitacao" | "proposta" | "tecnica" | "acessoria" (garantia, amostra, visita técnica, POC) | "prazo" | "comercial".
7. "confianca": "alta" (trecho literal claro, página identificada, exigência inequívoca), "media" (parcial ou dependente de interpretação), "baixa" (você não tem base literal clara). Na dúvida, use "baixa" — nunca invente exigência para preencher a resposta.
8. Se uma seção esperada (ex: habilitação técnica) não aparecer no texto fornecido, simplesmente não gere item para ela — não invente.

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, EXATAMENTE neste formato:

{
  "exigencias": [
    {
      "titulo": "nome curto (ex: Certidão Negativa de Débitos Federais)",
      "tipo": "habilitacao",
      "obrigatorio": true,
      "o_que_exige": "descrição objetiva do que o edital exige",
      "criterio_aceitacao": "critério objetivo para considerar atendido",
      "trecho": "transcrição literal do edital",
      "pagina": 12,
      "clausula": "8.3.2",
      "risco": "inabilita",
      "confianca": "alta"
    }
  ]
}`

const SYSTEM_PROMPT_MAPA = `${SYSTEM_PROMPT}

Você receberá apenas um TRECHO do edital (ele foi dividido em blocos por ser extenso). Extraia só as exigências presentes NESTE trecho. Se não houver nenhuma, devolva um array vazio — não invente.`

// Mesmo orçamento de caracteres/concorrência usado pelo Analyzer para a Groq
// gratuita (ver app/api/analisar/route.ts) — ajustar junto se o tier mudar.
const LIMITE_POR_BLOCO = 3_500
// O plano atual da Groq tem um orçamento muito baixo de tokens por minuto
// (8.000 TPM); chamadas concorrentes só disputam essa cota e geram mais 429,
// então processamos um bloco por vez.
const CONCORRENCIA_MAX_BLOCOS = 1

// Palavras-chave para priorizar seções quando o edital cabe numa única
// chamada mas ainda assim precisa ser reduzido (raro — só editais bem curtos
// não entram em map-reduce).
const PALAVRAS_CHAVE_EDITAL = [
  'habilitação', 'habilita', 'inabilitação', 'desclassifica', 'desclassificação',
  'qualificação técnica', 'qualificação econômico', 'regularidade fiscal', 'regularidade trabalhista',
  'documentação', 'documentos de habilitação', 'certidão', 'certidões', 'cnd', 'fgts', 'cndt',
  'atestado', 'capacidade técnica', 'balanço patrimonial', 'capital social', 'patrimônio líquido',
  'objeto', 'especificação', 'especificações técnicas', 'proposta', 'validade da proposta',
  'prazo de entrega', 'vigência', 'sessão', 'abertura das propostas', 'amostra', 'prova de conceito',
  'garantia', 'diligência', 'saneamento',
]

type ExigenciaBruta = { [K in keyof ExigenciaExtraida]?: unknown }

const TIPOS_VALIDOS = new Set<TipoExigencia>(['habilitacao', 'proposta', 'tecnica', 'acessoria', 'prazo', 'comercial'])
const RISCOS_VALIDOS = new Set<RiscoExigencia>(['desclassifica', 'inabilita', 'sanavel'])

/** Descarta itens sem os campos mínimos e normaliza enums fora do domínio para valores seguros. */
const normalizarExigencia = (bruta: ExigenciaBruta): ExigenciaExtraida | null => {
  if (typeof bruta.titulo !== 'string' || !bruta.titulo.trim()) return null
  if (typeof bruta.o_que_exige !== 'string' || !bruta.o_que_exige.trim()) return null
  if (typeof bruta.trecho !== 'string' || !bruta.trecho.trim()) return null

  const tipo = TIPOS_VALIDOS.has(bruta.tipo as TipoExigencia) ? (bruta.tipo as TipoExigencia) : 'habilitacao'
  const risco = RISCOS_VALIDOS.has(bruta.risco as RiscoExigencia) ? (bruta.risco as RiscoExigencia) : 'sanavel'
  const confianca = bruta.confianca === 'alta' || bruta.confianca === 'media' || bruta.confianca === 'baixa' ? bruta.confianca : 'media'

  return {
    titulo: bruta.titulo.trim(),
    tipo,
    obrigatorio: bruta.obrigatorio !== false,
    o_que_exige: bruta.o_que_exige.trim(),
    criterio_aceitacao: typeof bruta.criterio_aceitacao === 'string' ? bruta.criterio_aceitacao.trim() : '',
    trecho: bruta.trecho.trim(),
    pagina: typeof bruta.pagina === 'number' ? bruta.pagina : null,
    clausula: typeof bruta.clausula === 'string' && bruta.clausula.trim() ? bruta.clausula.trim() : null,
    risco,
    confianca,
  }
}

/**
 * Camada de verificação anti-alucinação (mesmo princípio do Analyzer, ver
 * app/api/analisar/route.ts): confere o trecho citado contra o texto real do
 * edital. Trecho que não existe no documento é rebaixado para baixa
 * confiança e marcado para verificação manual, em vez de apresentado como
 * exigência confirmada.
 */
const aplicarVerificacaoDocumental = (
  itens: ExigenciaExtraida[],
  textoEdital: string
): Array<ExigenciaExtraida & { requerVerificacaoManual: boolean }> => {
  const textoNormalizado = normalizarParaComparacao(textoEdital)

  return itens.map((item) => {
    let confianca = item.confianca
    if (!ehPlaceholderSemCitacao(item.trecho) && !evidenciaTemRespaldo(item.trecho, textoNormalizado)) {
      confianca = 'baixa'
    }
    return { ...item, confianca, requerVerificacaoManual: confianca === 'baixa' }
  })
}

const PESO_RISCO: Record<RiscoExigencia, number> = { desclassifica: 3, inabilita: 3, sanavel: 1 }

/** Não desclassifica/inabilita primeiro, sanável depois — dentro do mesmo grupo, mantém a ordem de extração. */
const ordenarPorRisco = <T extends { risco: RiscoExigencia }>(itens: T[]): T[] =>
  itens
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => (PESO_RISCO[b.item.risco] - PESO_RISCO[a.item.risco]) || (a.indice - b.indice))
    .map(({ item }) => item)

/** Remove exigências duplicadas (mesma cláusula + título semelhante) vindas de blocos com sobreposição. */
const deduplicar = (itens: ExigenciaExtraida[]): ExigenciaExtraida[] => {
  const vistos = new Map<string, ExigenciaExtraida>()
  for (const item of itens) {
    const chave = `${item.clausula ?? ''}|${item.titulo}`.trim().toLowerCase()
    const existente = vistos.get(chave)
    if (!existente || (existente.pagina == null && item.pagina != null)) {
      vistos.set(chave, item)
    }
  }
  return Array.from(vistos.values())
}

export interface ResultadoLeituraEdital {
  exigencias: Array<ExigenciaExtraida & { requerVerificacaoManual: boolean }>
}

export const lerEdital = async (textoEdital: string): Promise<ResultadoLeituraEdital> => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const blocos = dividirEmBlocosSequenciais(textoEdital, LIMITE_POR_BLOCO)

  let brutas: ExigenciaBruta[]

  if (blocos.length <= 1) {
    const editalFiltrado = extrairSecoesCriticas(textoEdital, PALAVRAS_CHAVE_EDITAL, LIMITE_POR_BLOCO)
    const rawText = await chamarGroqComRetry(groq, {
      model: 'openai/gpt-oss-120b',
      maxTokens: 3072,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `=== EDITAL ===\n${editalFiltrado}\n\nExtraia a matriz de conformidade em JSON.` },
      ],
    })
    const parsed = JSON.parse(rawText) as { exigencias?: ExigenciaBruta[] }
    brutas = parsed.exigencias ?? []
  } else {
    const respostasPorBloco = await executarComConcorrenciaLimitada(
      blocos,
      CONCORRENCIA_MAX_BLOCOS,
      async (bloco, indice) => {
        const rawText = await chamarGroqComRetry(groq, {
          model: 'openai/gpt-oss-120b',
          maxTokens: 2048,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT_MAPA },
            {
              role: 'user',
              content: `=== TRECHO ${indice + 1} DE ${blocos.length} DO EDITAL ===\n${bloco}\n\nExtraia só as exigências deste trecho, em JSON.`,
            },
          ],
        })
        try {
          const parsed = JSON.parse(rawText) as { exigencias?: ExigenciaBruta[] }
          return parsed.exigencias ?? []
        } catch {
          console.error(`Falha ao interpretar resposta do bloco ${indice + 1}/${blocos.length} do edital`)
          return []
        }
      }
    )
    brutas = respostasPorBloco.flat()
  }

  const normalizadas = brutas
    .map(normalizarExigencia)
    .filter((item): item is ExigenciaExtraida => item !== null)

  const exigencias = ordenarPorRisco(
    aplicarVerificacaoDocumental(deduplicar(normalizadas), textoEdital)
  )

  return { exigencias }
}
