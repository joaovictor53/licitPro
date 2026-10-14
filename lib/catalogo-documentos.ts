// lib/catalogo-documentos.ts
// Catálogo EXTENSÍVEL de tipos de documento. Portado de app/catalogo_personalizado.py do Proposta
// Certa: quando o edital exige um documento que nenhum tipo fixo cobre, o sistema propõe um tipo
// novo — nome, palavras-chave seguras, se tem validade e DE ONDE VEIO (exigência, página) — para
// o operador confirmar. Aqui só a parte pura (propor e casar); a gravação do tipo confirmado
// ainda não tem tabela própria.
//
// Segurança das palavras-chave (achado do testador do Proposta Certa): um tipo novo feito só de
// vocabulário genérico de certidão ("certidão negativa de débitos relativos") casaria com a
// federal, a estadual, a municipal e a do FGTS e passaria a "atender" exigências de outros
// documentos. Por isso só vira palavra-chave o que é DISTINTIVO.

import { normalizarParaBusca } from '@/lib/normalizar-busca'

const PALAVRAS_DE_VALIDADE = ['certidao', 'certificado', 'validade', 'vigente', 'vigencia', 'em vigor', 'licenca', 'alvara', 'registro', 'regularidade', 'negativa']
const PALAVRAS_SEM_VALIDADE = ['contrato social', 'estatuto', 'balanco', 'atestado', 'demonstra', 'declaracao', 'procuracao', 'ata ', 'comprovante de endereco']
const PALAVRAS_SEM_VALOR = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'a', 'o', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas', 'ao', 'aos', 'que', 'se', 'um', 'uma',
  'apresentar', 'apresentacao', 'comprovacao', 'comprovar', 'prova', 'copia', 'documento', 'documentos', 'licitante', 'empresa', 'edital',
  'conforme', 'expedida', 'expedido', 'emitida', 'emitido', 'valido', 'valida', 'original', 'autenticada', 'autenticado',
])
// Vocabulário de certidão/comprovante que aparece em dezenas de exigências diferentes.
const PALAVRAS_GENERICAS = new Set([
  'certidao', 'certidoes', 'negativa', 'negativas', 'positiva', 'positivas', 'debito', 'debitos', 'relativo', 'relativos', 'relativa', 'relativas',
  'regularidade', 'situacao', 'comprovante', 'certificado', 'atestado', 'declaracao', 'registro', 'inscricao', 'cadastro', 'prova', 'tributo',
  'tributos', 'municipal', 'municipais', 'estadual', 'estaduais', 'federal', 'federais', 'trabalhista', 'trabalhistas', 'fiscal', 'fiscais',
  'sede', 'matriz', 'filial', 'pessoa', 'juridica', 'vigente', 'vigencia',
])

export interface TipoDocumentoProposto {
  id: string
  nome: string
  /** A frase inteira e, havendo 3+ termos distintivos, o conjunto `{a b c}` (todos presentes, em qualquer ordem). */
  palavrasChave: string[]
  /** `true`/`false` só quando o texto deixa claro; `null` = o operador confirma. */
  temValidade: boolean | null
  /** Sempre "novo": o operador confirma ou descarta. */
  estado: 'novo_confirmar'
}

/** Nome vindo de PDF de terceiro: tira caractere de controle e de formatação (inversão de escrita, largura zero). */
const limparNome = (nome: string): string =>
  (nome ?? '')
    .split('')
    .filter((c) => !/[\p{Cc}\p{Cf}]/u.test(c) || /\s/.test(c))
    .join('')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .slice(0, 200)

export const palavrasImportantes = (nome: string): string[] =>
  normalizarParaBusca(nome)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter((p) => p.length > 2 && !PALAVRAS_SEM_VALOR.has(p))

export const termosDistintivos = (importantes: string[], vocabularioConhecido: Set<string> = new Set()): string[] =>
  importantes.filter((p) => !PALAVRAS_GENERICAS.has(p) && !vocabularioConhecido.has(p))

/** Palpite barato e conservador sobre validade: `true`/`false` quando o texto deixa claro, senão `null`. */
export const inferirTemValidade = (texto: string): boolean | null => {
  const normal = normalizarParaBusca(texto)
  if (PALAVRAS_SEM_VALIDADE.some((p) => normal.includes(p))) return false
  if (PALAVRAS_DE_VALIDADE.some((p) => normal.includes(p))) return true
  return null
}

const idPara = (nome: string, ocupados: Set<string>): string => {
  const base = normalizarParaBusca(nome).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'documento'
  let candidato = `novo_${base}`
  for (let n = 2; ocupados.has(candidato); n++) candidato = `novo_${base}_${n}`
  return candidato
}

/**
 * Propõe um tipo novo para um documento que o edital exige e nenhum tipo conhecido cobre. `null` se
 * o nome tem menos de 2 palavras importantes (viraria palavra-chave perigosa) ou se só tem
 * vocabulário já conhecido (é variação de um tipo que existe, não um tipo novo).
 * `vocabularioConhecido`: palavras que o catálogo fixo já usa — não servem de apoio para o tipo novo.
 */
export const proporNovoTipo = (
  nomeExigencia: string,
  opcoes: { trecho?: string; vocabularioConhecido?: Set<string>; idsOcupados?: Set<string> } = {}
): TipoDocumentoProposto | null => {
  const nome = limparNome(nomeExigencia)
  const importantes = palavrasImportantes(nome)
  if (importantes.length < 2) return null
  const distintivos = termosDistintivos(importantes, opcoes.vocabularioConhecido)
  if (!distintivos.length) return null

  const palavrasChave = [normalizarParaBusca(nome)]
  if (distintivos.length >= 3) palavrasChave.push(`{${distintivos.slice(0, 3).join(' ')}}`)
  return {
    id: idPara(nome, opcoes.idsOcupados ?? new Set()),
    nome,
    palavrasChave,
    temValidade: inferirTemValidade(`${nome} ${opcoes.trecho ?? ''}`),
    estado: 'novo_confirmar',
  }
}

/** O texto de uma exigência casa com estas palavras-chave (frase inteira, ou todos os termos do conjunto)? */
export const textoCasaComPalavrasChave = (textoExigencia: string, palavrasChave: string[]): boolean => {
  const norma = normalizarParaBusca(textoExigencia).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')
  return palavrasChave.some((palavra) => {
    if (palavra.startsWith('{') && palavra.endsWith('}')) {
      const termos = palavra.slice(1, -1).split(' ').filter(Boolean)
      return termos.length >= 3 && termos.every((t) => norma.includes(t))
    }
    const frase = palavra.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
    return frase.length >= 4 && norma.includes(frase)
  })
}

/** Dois nomes dizem praticamente a mesma coisa (semelhança de palavras importantes ≥ 75%)? Evita criar "Certidão de X" e "Certidão negativa de X" como dois tipos. */
export const nomesSemelhantes = (a: string, b: string): boolean => {
  const ca = new Set(palavrasImportantes(a))
  const cb = new Set(palavrasImportantes(b))
  if (!ca.size || !cb.size) return false
  const intersecao = [...ca].filter((p) => cb.has(p)).length
  return intersecao / new Set([...ca, ...cb]).size >= 0.75
}
