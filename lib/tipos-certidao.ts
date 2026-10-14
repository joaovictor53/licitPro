// lib/tipos-certidao.ts
// Situação de uma certidão pelo TÍTULO do documento. Portado de app/tipos_certidao.py do Proposta Certa.
//
// Três situações:
//  - NEGATIVA: não há débito/pendência;
//  - POSITIVA COM EFEITOS DE NEGATIVA: há crédito, mas com exigibilidade suspensa/garantido —
//    vale como regular (CTN, art. 206; a trabalhista equivalente segue a mesma lógica);
//  - POSITIVA: com restrição (pendência real).
//
// O reconhecimento é determinístico (texto compacto, sem acento, só o TÍTULO — um corpo que cita
// "certidão negativa" como comparação não pode decidir) e nunca inventa: sem título
// reconhecível devolve `null`.

export type SituacaoCertidao = 'negativa' | 'positiva_com_efeitos_de_negativa' | 'positiva'

export const ROTULOS_SITUACAO_CERTIDAO: Record<SituacaoCertidao, string> = {
  negativa: 'Negativa',
  positiva_com_efeitos_de_negativa: 'Positiva com efeitos de negativa',
  positiva: 'Positiva (com restrição)',
}

/** Região do texto considerada "título": o começo do documento. */
const TAMANHO_REGIAO_TITULO = 700

const RE_POSITIVA_COM_EFEITOS = /positiva.{0,150}?comefeitos?denegativa/
const RE_POSITIVA = /certidaopositiva|positivadedebitos|positivadecreditos/
const RE_NEGATIVA = /certidaonegativa|negativadedebitos|negativadecreditos/

/** Minúsculas, sem acento e sem nenhum caractere que não seja letra ou número (inclusive espaço). */
const compactar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

export interface ResultadoSituacaoCertidao {
  situacao: SituacaoCertidao
  trecho: string
}

/**
 * O TÍTULO manda: vale o PRIMEIRO termo que aparece na região inicial do texto. Empate na mesma
 * posição ("certidão positiva com efeitos de negativa" também contém "certidão positiva" e
 * "negativa"): positiva com efeitos de negativa > positiva > negativa.
 */
export const classificarSituacaoCertidao = (texto: string | null | undefined): ResultadoSituacaoCertidao | null => {
  if (!texto) return null
  const regiao = compactar(texto).slice(0, TAMANHO_REGIAO_TITULO)
  const candidatos: Array<{ inicio: number; prioridade: number; resultado: ResultadoSituacaoCertidao }> = []
  const tabela: Array<[RegExp, SituacaoCertidao]> = [
    [RE_POSITIVA_COM_EFEITOS, 'positiva_com_efeitos_de_negativa'],
    [RE_POSITIVA, 'positiva'],
    [RE_NEGATIVA, 'negativa'],
  ]
  tabela.forEach(([regex, situacao], prioridade) => {
    const achado = regex.exec(regiao)
    if (!achado) return
    let inicio = achado.index
    if (regiao.slice(0, inicio).endsWith('certidao')) inicio -= 'certidao'.length // o "certidão" que antecede o termo é parte do título
    candidatos.push({ inicio, prioridade, resultado: { situacao, trecho: achado[0] } })
  })
  if (!candidatos.length) return null
  candidatos.sort((a, b) => a.inicio - b.inicio || a.prioridade - b.prioridade)
  return candidatos[0].resultado
}

/** Negativa e positiva com efeitos de negativa valem como regulares. */
export const valeComoRegular = (situacao: string | null | undefined): boolean =>
  situacao === 'negativa' || situacao === 'positiva_com_efeitos_de_negativa'

export const temRestricao = (situacao: string | null | undefined): boolean => situacao === 'positiva'
