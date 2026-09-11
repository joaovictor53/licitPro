// lib/cnae-auto-geracao.ts
// Geração automática (sob demanda) de palavras-chave de busca para um CNAE
// que ainda não está em `cnae_por_objeto` — usa a API pública do IBGE
// (mesma fonte de data/cnae-ibge.json, mas aqui buscando o detalhe de UM
// CNAE, que inclui a lista de "atividades" sinônimas).
//
// Só gera `busca`. `naoTraz` fica vazio: as notas "não compreende" do IBGE
// referenciam outras subclasses por código, não são uma lista limpa de
// palavras-chave, e uma exclusão automática malfeita é pior do que nenhuma
// — arriscaria esconder editais relevantes. Fica para a Arumã completar
// depois, revisando a linha (marcada com `curadoManualmente: false`).

const URL_BASE = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses'
const TIMEOUT_MS = 15_000

interface RespostaSubclasseIbge {
  id: string
  descricao: string
  atividades?: string[]
}

const soDigitos = (cnae: string): string => cnae.replace(/\D/g, '')

const formatarCodigo = (digitos: string): string =>
  `${digitos.slice(0, 4)}-${digitos.slice(4, 5)}/${digitos.slice(5, 7)}`

const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// Prefixos genéricos que o IBGE usa em milhares de subclasses diferentes
// (ex: "comércio varejista" aparece em ~600 das 1.332 subclasses). Quando a
// inversão alfabética das "atividades" deixa um desses sozinho como
// fragmento (ex: "SUPERMERCADO - ...; COMÉRCIO VAREJISTA" → o fragmento
// "COMÉRCIO VAREJISTA" isolado), ele não discrimina nada — usá-lo como
// palavra-chave daria falso positivo em qualquer edital de compra de bens.
const FRAGMENTOS_GENERICOS_DEMAIS = new Set(
  [
    'comércio varejista',
    'comércio atacadista',
    'comércio atacadista e varejista',
    'comércio varejista e atacadista',
    'serviço de',
    'serviços de',
    'atividades de',
    'outros serviços',
    'prestação de serviços',
    'fabricação de',
    'indústria de',
    'produção de',
    'cultivo de',
    'criação de',
    'manutenção e reparação',
    'transporte rodoviário de',
    'locação de',
    'aluguel de',
  ].map(normalizarTexto)
)

// As "atividades" do IBGE costumam vir em ordem invertida para indexação
// alfabética (ex: "ADMINISTRAÇÃO DE OBRAS; SERVIÇO DE"). Cada fragmento
// separado por ";" já costuma ser uma frase com sentido próprio — usamos os
// fragmentos como estão, descartando os curtos demais (ex: "SERVIÇO DE") e
// os genéricos demais (ex: "COMÉRCIO VAREJISTA"), que como palavra-chave
// dariam falso positivo em quase qualquer edital.
const TAMANHO_MINIMO_FRAGMENTO = 8

const extrairFragmentosUteis = (texto: string): string[] =>
  texto
    .split(';')
    .map((f) => f.trim())
    .filter(
      (f) =>
        f.length >= TAMANHO_MINIMO_FRAGMENTO &&
        f.split(' ').length > 1 &&
        !FRAGMENTOS_GENERICOS_DEMAIS.has(normalizarTexto(f))
    )

export interface CnaeGerado {
  cnae: string
  descricao: string
  busca: string[]
}

/**
 * Busca o detalhe do CNAE no IBGE e monta a lista de `busca`. Retorna `null`
 * se o código não existir no IBGE ou a API falhar — quem chama decide como
 * tratar (nesse caso o radar não tem como buscar por esse CNAE de jeito
 * nenhum, automático ou manual).
 */
export const gerarPalavrasChaveCnae = async (cnae: string): Promise<CnaeGerado | null> => {
  const digitos = soDigitos(cnae)
  if (digitos.length !== 7) return null

  const controle = new AbortController()
  const timeout = setTimeout(() => controle.abort(), TIMEOUT_MS)

  let resposta: Response
  try {
    resposta = await fetch(`${URL_BASE}/${digitos}`, {
      headers: { Accept: 'application/json' },
      signal: controle.signal,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }

  if (!resposta.ok) return null

  const dados = (await resposta.json().catch(() => null)) as RespostaSubclasseIbge | null
  if (!dados?.descricao) return null

  const fragmentosAtividades = (dados.atividades ?? []).flatMap(extrairFragmentosUteis)
  const busca = Array.from(new Set([dados.descricao, ...fragmentosAtividades].map((t) => t.trim())))

  return {
    cnae: formatarCodigo(digitos),
    descricao: dados.descricao,
    busca,
  }
}
