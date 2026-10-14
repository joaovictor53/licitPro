// lib/exigencias-proposta.ts
// Ferramenta 8 / 3 — o que o edital exige da PROPOSTA (condições comerciais).
// Portado da conferência independente de IA de app/exigencias_proposta.py do Proposta Certa:
// procura no texto do edital os campos que costumam ser exigidos (validade da proposta,
// prazo de entrega, garantia, marca, modelo, fabricante, procedência, dados bancários), com
// página e trecho literal, e o limite numérico quando há ("no mínimo 60 dias").
//
// Sem IA, determinístico: cada campo só existe se o texto do edital o cita, e o trecho
// citado é o do próprio edital. Fecha as duas conferências que lib/montagem-proposta.ts
// declarava fora de escopo (prazo de validade e de entrega contra o exigido).

import { normalizarParaBusca } from '@/lib/normalizar-busca'
import { MARCADOR_PAGINA } from '@/lib/texto-blocos'

import type { UnidadePrazo } from '@/types/proposta-tipos'

export type { UnidadePrazo }

export interface CampoExigidoProposta {
  id: string
  rotulo: string
  tipo: 'prazo' | 'texto'
  /** 'minimo': a proposta não pode oferecer menos (validade, garantia). 'maximo': não pode oferecer mais (entrega). */
  sentido: 'minimo' | 'maximo' | null
  limite: number | null
  unidade: UnidadePrazo | null
  referencia: { pagina: number; trecho: string }
}

interface Termo {
  id: string
  rotulo: string
  tipo: 'prazo' | 'texto'
  sentido: 'minimo' | 'maximo' | null
  padrao: RegExp
  padraoLimite?: RegExp
  exigeVerbo?: boolean
}

// O número não pode ser parte de um decimal ("1,5 anos"): sem o lookbehind, o "5" virava o limite.
const NUM = '(?<![\\d.,])(\\d{1,4})\\s*(?:\\([^)]{0,40}\\)\\s*)?'
const VERBO_INFORMAR = /\b(informar|informe|indicar|indique|constar|conter|especificar|declarar|apresentar|preencher)\w*/

const TERMOS: Termo[] = [
  {
    id: 'validade_proposta', rotulo: 'Validade da proposta', tipo: 'prazo', sentido: 'minimo',
    padrao: /validade (?:minima )?da proposta|proposta (?:tera|tem|devera ter|sera) validade|proposta (?:valida|devera ser valida)/,
    padraoLimite: new RegExp(`(?:validade|valida)[^.;\\n]{0,80}?${NUM}(dias|meses)`),
  },
  {
    id: 'prazo_entrega', rotulo: 'Prazo de entrega', tipo: 'prazo', sentido: 'maximo',
    padrao: /prazo (?:maximo |limite )?de entrega|entrega (?:(?:sera|deve ser|devera ser) )?(?:no|em) (?:ate )?\d/,
    padraoLimite: new RegExp(`(?:prazo|entrega)[^.;\\n]{0,80}?${NUM}(dias(?: uteis| corridos)?|horas|meses)`),
  },
  {
    id: 'garantia', rotulo: 'Garantia', tipo: 'prazo', sentido: 'minimo',
    padrao: /\bgarantia (?:minima |do produto |dos bens |tecnica |de fabrica)|prazo de garantia/,
    padraoLimite: new RegExp(`garantia[^.;\\n]{0,80}?${NUM}(meses|anos|dias)`),
  },
  { id: 'marca', rotulo: 'Marca', tipo: 'texto', sentido: null, padrao: /\bmarca\b/, exigeVerbo: true },
  { id: 'modelo', rotulo: 'Modelo', tipo: 'texto', sentido: null, padrao: /\bmodelo\b/, exigeVerbo: true },
  { id: 'fabricante', rotulo: 'Fabricante', tipo: 'texto', sentido: null, padrao: /\bfabricante\b/, exigeVerbo: true },
  { id: 'procedencia', rotulo: 'Procedência', tipo: 'texto', sentido: null, padrao: /\bprocedencia\b/, exigeVerbo: true },
  // exige verbo de "informar": a conta corrente da PREFEITURA (caução, taxa) não é dado bancário da proposta
  { id: 'dados_bancarios', rotulo: 'Dados bancários', tipo: 'texto', sentido: null, padrao: /dados bancarios|conta corrente|numero da conta/, exigeVerbo: true },
]

// Frases com prazo que não são o prazo do campo (pagamento, recurso, vigência...).
const ASSUNTOS_QUE_NAO_SAO_O_PRAZO =
  /pagamento|recurso|impugna|esclarecimento|vistoria|credenciamento|sancao|multa|prazo de vigencia|vigencia d[oa] (?:contrato|ata)|reajuste|adjudica|homologa|(?:apresentacao|entrega|envio) d[oa]s? (?:documentos|propostas?|habilitacao|envelopes?|lances?)/
// "Nota de empenho" é assunto de outro prazo e também o MARCO de contagem do prazo do campo
// ("entrega em 15 dias após a nota de empenho"): só exclui a oração que não fala do assunto do campo.
const MARCOS_DE_CONTAGEM = /nota fiscal|empenho|assinatura d[oa] (?:contrato|ata)|ordem de (?:fornecimento|servico|compra)/
const PALAVRA_PROPRIA: Record<string, RegExp> = { validade_proposta: /valid/, prazo_entrega: /entrega/, garantia: /garantia/ }
// Só o prazo de entrega precisa: sua expressão começa em "prazo" (qualquer prazo).
const FRASE_DE_OUTRO_CAMPO: Record<string, RegExp> = { prazo_entrega: /validade|valida\b|garantia|assistencia/ }
// Oração = frase (quebra de linha, ";", ". ") ou "... e o prazo de ...".
const RE_ORACOES = /[\n;]+|\.\s|\s+e\s+(?=(?:o|a|os|as|prazo|entrega|validade|garantia|pagamento)\b)/

const normalizarUnidade = (texto: string): UnidadePrazo => {
  const primeira = texto.split(' ')[0]
  return primeira === 'horas' || primeira === 'meses' || primeira === 'anos' ? primeira : 'dias'
}

/** O primeiro "N dias/meses" do trecho que fala do assunto do campo, frase a frase. */
const primeiroLimiteDoAssunto = (termo: Termo, trecho: string): { limite: number; unidade: UnidadePrazo } | null => {
  if (!termo.padraoLimite) return null
  const deOutroCampo = FRASE_DE_OUTRO_CAMPO[termo.id]
  for (const frase of normalizarParaBusca(trecho).split(RE_ORACOES)) {
    if (ASSUNTOS_QUE_NAO_SAO_O_PRAZO.test(frase) || (deOutroCampo && deOutroCampo.test(frase))) continue
    const propria = PALAVRA_PROPRIA[termo.id]
    if (MARCOS_DE_CONTAGEM.test(frase) && !(propria && propria.test(frase))) continue
    const achado = termo.padraoLimite.exec(frase)
    if (achado) return { limite: Number(achado[1]), unidade: normalizarUnidade(achado[2]) }
  }
  return null
}

/** Os campos de condição da proposta que o texto do edital cita, cada um com página e trecho literal. */
export const lerCamposExigidos = (textoEdital: string): CampoExigidoProposta[] => {
  const campos: CampoExigidoProposta[] = []
  for (const termo of TERMOS) {
    let pagina = 1
    for (const linha of (textoEdital ?? '').split('\n')) {
      const marcador = linha.trim().match(MARCADOR_PAGINA)
      if (marcador && marcador[0] === linha.trim()) {
        pagina = Number(marcador[1])
        continue
      }
      const norma = normalizarParaBusca(linha)
      if (!termo.padrao.test(norma) || (termo.exigeVerbo && !VERBO_INFORMAR.test(norma))) continue
      const achado = primeiroLimiteDoAssunto(termo, linha)
      campos.push({
        id: termo.id,
        rotulo: termo.rotulo,
        tipo: termo.tipo,
        sentido: termo.sentido,
        limite: achado?.limite ?? null,
        unidade: achado?.unidade ?? null,
        referencia: { pagina, trecho: linha.trim().slice(0, 500) },
      })
      break
    }
  }
  return campos
}

const DIAS_POR_UNIDADE: Record<UnidadePrazo, number> = { horas: 1 / 24, dias: 1, meses: 30, anos: 365 }

export const emDias = (valor: number, unidade: UnidadePrazo): number => valor * DIAS_POR_UNIDADE[unidade]

export interface ValorInformado {
  valor: number | string
  unidade?: UnidadePrazo | null
}

export interface ResultadoCondicao {
  ok: boolean
  mensagem: string
}

const ondeNoEdital = (campo: CampoExigidoProposta): string => `edital, pág. ${campo.referencia.pagina}`

/**
 * Confere a condição que o operador oferece contra o que o edital exige. Prazo pior que o do
 * edital (validade ou garantia menor, entrega maior) é recusado; campo de texto exigido não
 * pode ficar vazio. Sem limite numérico lido, aceita o prazo mas manda conferir no trecho.
 */
export const conferirCondicao = (campo: CampoExigidoProposta, informado: ValorInformado | null | undefined): ResultadoCondicao => {
  if (campo.tipo === 'texto') {
    const texto = informado?.valor == null ? '' : String(informado.valor).trim()
    return texto
      ? { ok: true, mensagem: '' }
      : { ok: false, mensagem: `${campo.rotulo}: o edital exige a informação (${ondeNoEdital(campo)}).` }
  }

  const numero = informado?.valor == null || informado.valor === '' ? NaN : Number(String(informado.valor).replace(',', '.'))
  if (!Number.isFinite(numero) || numero <= 0) {
    return { ok: false, mensagem: `${campo.rotulo}: informe o prazo oferecido (${ondeNoEdital(campo)}).` }
  }
  if (campo.limite == null || campo.unidade == null || campo.sentido == null) {
    return { ok: true, mensagem: '' }
  }

  const oferecido = emDias(numero, informado?.unidade ?? campo.unidade)
  const exigido = emDias(campo.limite, campo.unidade)
  const pior = campo.sentido === 'minimo' ? oferecido < exigido : oferecido > exigido
  if (!pior) return { ok: true, mensagem: '' }
  const regra = campo.sentido === 'minimo' ? 'no mínimo' : 'no máximo'
  return {
    ok: false,
    mensagem: `${campo.rotulo}: o edital exige ${regra} ${campo.limite} ${campo.unidade} (${ondeNoEdital(campo)}); ${numero} ${informado?.unidade ?? campo.unidade} é pior que o exigido.`,
  }
}

/** Campos de texto que valem POR ITEM (a marca/modelo de cada item da composição de preço), não um valor único da proposta. */
export const CAMPOS_POR_ITEM = new Set(['marca', 'modelo', 'fabricante'])

/**
 * Pendências das condições da proposta: cada campo exigido pelo edital precisa ter valor e
 * não pior que o exigido; marca/modelo/fabricante exigidos valem item a item (`marcaModelo`).
 */
export const avaliarCondicoesProposta = (
  campos: CampoExigidoProposta[],
  condicoes: Record<string, { valor: string; unidade?: UnidadePrazo | null }>,
  itens: Array<{ ordem: number; marcaModelo: string | null }>
): string[] => {
  const pendencias: string[] = []
  for (const campo of campos) {
    if (CAMPOS_POR_ITEM.has(campo.id)) {
      const sem = itens.filter((item) => !item.marcaModelo?.trim()).map((item) => item.ordem)
      if (sem.length) {
        pendencias.push(`${campo.rotulo}: o edital exige (${ondeNoEdital(campo)}) e faltam no(s) item(ns) ${sem.join(', ')}.`)
      }
      continue
    }
    const resultado = conferirCondicao(campo, condicoes[campo.id])
    if (!resultado.ok) pendencias.push(resultado.mensagem)
  }
  return pendencias
}

/** Linhas "Rótulo: valor [unidade]" das condições que entram no PDF da proposta (os campos por item ficam nas linhas dos itens). */
export const linhasDeCondicoes = (
  campos: CampoExigidoProposta[],
  condicoes: Record<string, { valor: string; unidade?: UnidadePrazo | null }>
): string[] =>
  campos
    .filter((campo) => !CAMPOS_POR_ITEM.has(campo.id) && condicoes[campo.id]?.valor?.trim())
    .map((campo) => {
      const c = condicoes[campo.id]
      return `${campo.rotulo}: ${c.valor.trim()}${campo.tipo === 'prazo' ? ` ${c.unidade ?? campo.unidade ?? 'dias'}` : ''}`
    })
