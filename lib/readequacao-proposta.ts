// lib/readequacao-proposta.ts
// Proposta readequada depois dos lances. Portado de app/readequacao_proposta.py do Proposta Certa.
//
// O operador informa o valor final (lance). O sistema ajusta os preços unitários de forma
// PROPORCIONAL ou ITEM A ITEM (escolha do operador), refaz as contas em centavos exatos e aplica
// as regras do edital, configuráveis e com página: "vedado aumentar preço unitário" e "total
// igual ao lance". Nunca inventa preço: o resultado só existe a partir do preço da proposta
// inicial e do lance informado.
//
// Puro (sem banco): quem chama grava os preços se o resultado não estiver bloqueado.

import { arredondarCentavos, dividirArredondado, emMicro, multiplicarEmCentavos } from '@/lib/dinheiro'
import { normalizarParaBusca } from '@/lib/normalizar-busca'
import { MARCADOR_PAGINA } from '@/lib/texto-blocos'

export interface ItemReadequacao {
  id: string
  ordem: number
  quantidade: number
  /** Preço unitário da proposta inicial; item sem preço não participa. */
  precoOfertado: number | null
}

export interface RegrasReadequacao {
  vedadoAumentarUnitario: boolean
  totalIgualAoLance: boolean
  pagina: number | null
  trecho: string | null
}

export const REGRAS_PADRAO: RegrasReadequacao = { vedadoAumentarUnitario: true, totalIgualAoLance: true, pagina: null, trecho: null }

const RE_VEDA = /(vedad[oa]|nao (?:podera|sera permitid[oa]|poderao)|proibid[oa])[^.;\n]{0,80}(aument|majora|elevar|acrescimo)/

/**
 * Procura no edital a frase que veda aumentar o preço unitário na readequação, com a página.
 * É só uma SUGESTÃO: o operador confirma. `null` quando o texto não diz nada parecido.
 */
export const sugerirRegrasNoTexto = (textoEdital: string): RegrasReadequacao | null => {
  let pagina = 1
  for (const linha of (textoEdital ?? '').split('\n')) {
    const marcador = linha.trim().match(MARCADOR_PAGINA)
    if (marcador && marcador[0] === linha.trim()) {
      pagina = Number(marcador[1])
      continue
    }
    const norma = normalizarParaBusca(linha)
    if ((norma.includes('unitario') || norma.includes('preco')) && RE_VEDA.test(norma)) {
      return { vedadoAumentarUnitario: true, totalIgualAoLance: true, pagina, trecho: linha.trim().slice(0, 400) }
    }
  }
  return null
}

export interface ResultadoReadequacao {
  /** Novo preço unitário por id de item (só os itens ajustados). */
  novosPrecos: Record<string, number>
  totalAnterior: number
  totalNovo: number
  lance: number | null
  violacoes: string[]
  /** Com violação, o resultado não pode ser aplicado. */
  bloqueada: boolean
}

const centavos = (valor: number): number => Math.round(valor * 100)
const emReais = (c: number): number => c / 100
const brl = (valor: number): string => `R$ ${valor.toFixed(2).replace('.', ',')}`

const ondeNoEdital = (regras: RegrasReadequacao): string => (regras.pagina ? ` (edital, pág. ${regras.pagina})` : '')

const totalDosItens = (itens: ItemReadequacao[], precos: Record<string, number>): number =>
  itens.reduce((soma, item) => soma + centavos(multiplicarEmCentavos(precos[item.id] ?? 0, item.quantidade)), 0) / 100

const precosAtuais = (itens: ItemReadequacao[]): Record<string, number> =>
  Object.fromEntries(itens.filter((i) => i.precoOfertado != null && i.precoOfertado > 0).map((i) => [i.id, i.precoOfertado as number]))

const LIMITE_BUSCA_CENTAVOS = 20_000

/**
 * Menor sequência de passos (cada um ±q centavos de resíduo) que leva `residuo` a zero — o problema
 * das "moedas" com sinal. Busca em largura limitada; `null` se não há solução dentro do limite.
 */
export const menorCaminhoEmCentavos = (residuo: number, sobe: number[], desce: number[]): number[] | null => {
  if (residuo === 0) return []
  const anterior = new Map<number, [number, number]>([[residuo, [residuo, 0]]])
  const fila = [residuo]
  for (let cabeca = 0; cabeca < fila.length; cabeca++) {
    const atual = fila[cabeca]
    for (const [q, sinal] of [...sobe.map((q) => [q, -1] as const), ...desce.map((q) => [q, 1] as const)]) {
      const proximo = atual + sinal * q
      if (anterior.has(proximo) || Math.abs(proximo) > LIMITE_BUSCA_CENTAVOS) continue
      anterior.set(proximo, [atual, sinal * q])
      if (proximo === 0) {
        const caminho: number[] = []
        let no = 0
        while (no !== residuo) {
          const [noAnterior, movimento] = anterior.get(no)!
          caminho.push(movimento)
          no = noAnterior
        }
        return caminho
      }
      fila.push(proximo)
    }
  }
  return null
}

/**
 * Fecha a diferença de centavos entre o total e o lance mexendo em ±R$ 0,01 no unitário de alguns
 * itens (isso muda o total do item em quantidade × R$ 0,01). Só usa itens de quantidade inteira.
 * Se nenhuma combinação respeita as regras, não mexe em nada — quem avisa é a conferência do
 * total, nunca um chute.
 */
const ajustarCentavos = (
  unitarios: Record<string, number>,
  itens: ItemReadequacao[],
  alvo: number,
  teto: Record<string, number> | null
): void => {
  const residuo = centavos(alvo) - centavos(totalDosItens(itens, unitarios))
  if (residuo === 0) return
  const porPasso = new Map<number, string[]>()
  for (const item of itens) {
    if (Number.isInteger(item.quantidade) && item.quantidade > 0) porPasso.set(item.quantidade, [...(porPasso.get(item.quantidade) ?? []), item.id])
  }
  const sobe = [...porPasso.entries()]
    .filter(([, ids]) => !teto || ids.some((id) => centavos(unitarios[id]) + 1 <= centavos(teto[id])))
    .map(([q]) => q)
    .sort((a, b) => a - b)
  const caminho = menorCaminhoEmCentavos(residuo, sobe, [...porPasso.keys()].sort((a, b) => a - b))
  if (!caminho) return

  const novos = { ...unitarios }
  for (const movimento of caminho) {
    // o movimento é a variação do RESÍDUO (lance − total): resíduo −q = total +q = unitário +R$ 0,01
    const q = Math.abs(movimento)
    const sinal = movimento > 0 ? -1 : 1
    const escolhido = (porPasso.get(q) ?? []).find((id) => {
      const candidato = centavos(novos[id]) + sinal
      return candidato > 0 && !(sinal > 0 && teto && candidato > centavos(teto[id]))
    })
    if (!escolhido) return // nenhum item daquele tamanho aguenta o passo: desiste sem mexer
    novos[escolhido] = emReais(centavos(novos[escolhido]) + sinal)
  }
  Object.assign(unitarios, novos)
}

const finalizar = (
  itensTodos: ItemReadequacao[],
  novos: Record<string, number>,
  lance: number | null,
  alvoTotal: number | null,
  regras: RegrasReadequacao,
  escopo: Set<string>
): ResultadoReadequacao => {
  const originais = precosAtuais(itensTodos)
  const totalAnterior = totalDosItens(itensTodos, originais)
  const totalNovo = totalDosItens(itensTodos, { ...originais, ...novos })
  const violacoes: string[] = []

  if (regras.vedadoAumentarUnitario) {
    for (const item of itensTodos) {
      const novo = novos[item.id]
      if (novo != null && originais[item.id] != null && novo > originais[item.id]) {
        violacoes.push(
          `Item ${item.ordem}: o preço unitário subiria de ${brl(originais[item.id])} para ${brl(novo)} — o edital veda aumentar o preço unitário na readequação${ondeNoEdital(regras)}.`
        )
      }
    }
  }
  if (regras.totalIgualAoLance && alvoTotal != null) {
    const somaEscopo = totalDosItens(itensTodos.filter((i) => escopo.has(i.id)), { ...originais, ...novos })
    if (centavos(somaEscopo) !== centavos(alvoTotal)) {
      violacoes.push(
        `O total readequado (${brl(somaEscopo)}) não é exatamente igual ao lance (${brl(alvoTotal)}); diferença de ${brl(Math.abs(alvoTotal - somaEscopo))}. ` +
          `O edital exige total igual ao lance${ondeNoEdital(regras)}. Ajuste os preços item a item.`
      )
    }
  }
  return { novosPrecos: novos, totalAnterior, totalNovo, lance, violacoes, bloqueada: violacoes.length > 0 }
}

/**
 * Reduz (ou, se a regra permitir, aumenta) TODOS os preços unitários dos itens com preço pelo mesmo
 * fator, de modo que o total desses itens seja o `lance`. Fecha os centavos.
 */
export const ajustarProporcional = (itens: ItemReadequacao[], lance: number, regras: RegrasReadequacao = REGRAS_PADRAO): ResultadoReadequacao => {
  const atuais = precosAtuais(itens)
  const escopo = itens.filter((i) => atuais[i.id] != null)
  const semNada = (mensagem: string): ResultadoReadequacao => {
    const r = finalizar(itens, {}, lance, null, regras, new Set())
    return { ...r, violacoes: [...r.violacoes, mensagem], bloqueada: true }
  }
  if (!escopo.length || escopo.some((i) => !(i.quantidade > 0))) return semNada('Não há item com preço e quantidade para readequar.')
  const totalAtual = totalDosItens(escopo, atuais)
  if (!(totalAtual > 0) || !Number.isFinite(lance) || lance <= 0) return semNada('Informe um lance maior que zero.')

  const lanceMicro = emMicro(arredondarCentavos(lance))
  const totalMicro = emMicro(totalAtual)
  const novos: Record<string, number> = {}
  for (const item of escopo) {
    // preço × lance ÷ total, em micro-unidades, arredondado a centavos (metade para cima), nunca abaixo de R$ 0,01
    const emCentavos = dividirArredondado(emMicro(atuais[item.id]) * lanceMicro, totalMicro * BigInt(10000))
    novos[item.id] = Math.max(Number(emCentavos), 1) / 100
  }
  if (regras.totalIgualAoLance) ajustarCentavos(novos, escopo, lance, regras.vedadoAumentarUnitario ? atuais : null)
  return finalizar(itens, novos, lance, lance, regras, new Set(escopo.map((i) => i.id)))
}

/** O operador digita o novo unitário de cada item. Se `lance` vier, o total dos itens com preço tem de fechar nele. */
export const ajustarItemAItem = (
  itens: ItemReadequacao[],
  novosPrecos: Record<string, number>,
  regras: RegrasReadequacao = REGRAS_PADRAO,
  lance: number | null = null
): ResultadoReadequacao => {
  const atuais = precosAtuais(itens)
  const validos = Object.fromEntries(Object.entries(novosPrecos).filter(([id, p]) => atuais[id] != null && Number.isFinite(p) && p > 0))
  const ignorados = Object.keys(novosPrecos).filter((id) => !(id in validos))
  const escopo = new Set(lance != null ? Object.keys(atuais) : Object.keys(validos))
  const resultado = finalizar(itens, validos, lance, lance, regras, escopo)
  const violacoes = [
    ...resultado.violacoes,
    ...ignorados.map((id) => `Item ${itens.find((i) => i.id === id)?.ordem ?? id}: preço inválido ou item que a empresa não oferta.`),
  ]
  return { ...resultado, violacoes, bloqueada: violacoes.length > 0 }
}
