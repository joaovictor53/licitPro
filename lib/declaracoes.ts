// lib/declaracoes.ts
// Declarações e procuração da habilitação. Portado de gerador_declaracoes.py, declaracao_do_edital.py
// e poderes_signatario.py do Proposta Certa. Em ordem de preferência:
//   1. TEXTO PADRÃO por tipo (fato impeditivo, menor/aprendiz, ME/EPP, declaração única);
//   2. TRECHO do edital: a declaração cita literalmente o que o edital exige.
// Toda declaração sai marcada "confira antes de assinar", e nunca com campo em branco: faltou
// dado, ela não é gerada e diz o que informar. O sistema NUNCA assina: o documento sai para o
// sócio/administrador (ou procurador) assinar.
//
// Os textos são modelos gerais, citam a legislação e precisam de revisão jurídica antes de uso.

import { normalizarParaBusca } from '@/lib/normalizar-busca'

export type TipoDeclaracao = 'fato_impeditivo' | 'menor_aprendiz' | 'me_epp' | 'diversas_habilitacao'

const ASSINATURA = `_______________________________________
{{REPRESENTANTE_LEGAL}}
Representante legal
{{RAZAO_SOCIAL}}
CNPJ nº {{CNPJ}}`

const ABERTURA = `A empresa {{RAZAO_SOCIAL}}, inscrita no CNPJ sob o nº {{CNPJ}}, por intermédio de seu representante legal infra-assinado, o(a) Sr(a). {{REPRESENTANTE_LEGAL}}, portador(a) do CPF nº {{CPF_REPRESENTANTE}}, DECLARA`

export const MODELOS: Record<TipoDeclaracao, { titulo: string; texto: string }> = {
  fato_impeditivo: {
    titulo: 'Declaração de inexistência de fato impeditivo da habilitação',
    texto: `DECLARAÇÃO DE INEXISTÊNCIA DE FATO IMPEDITIVO DA HABILITAÇÃO

${ABERTURA}, sob as penas da lei e para os fins do disposto no inciso IV do art. 63 da Lei nº 14.133, de 1º de abril de 2021, que não existe fato superveniente impeditivo de sua habilitação na presente licitação.

A declarante compromete-se, ainda, a informar à Administração, imediatamente e por escrito, a ocorrência de qualquer fato posterior que venha a impedir sua habilitação ou participação no certame, sob as sanções cabíveis.

{{CIDADE}}, {{DATA_ASSINATURA}}.

${ASSINATURA}`,
  },
  menor_aprendiz: {
    titulo: 'Declaração de cumprimento do inciso XXXIII do art. 7º da Constituição Federal',
    texto: `DECLARAÇÃO DE CUMPRIMENTO DO DISPOSTO NO INCISO XXXIII DO ART. 7º DA CONSTITUIÇÃO FEDERAL

${ABERTURA}, para fins do disposto no inciso VI do art. 68 da Lei nº 14.133, de 1º de abril de 2021, que não emprega menor de 18 (dezoito) anos em trabalho noturno, perigoso ou insalubre, e não emprega menor de 16 (dezesseis) anos, salvo na condição de aprendiz, a partir de 14 (catorze) anos, nos termos do inciso XXXIII do art. 7º da Constituição Federal.

{{CIDADE}}, {{DATA_ASSINATURA}}.

${ASSINATURA}`,
  },
  me_epp: {
    titulo: 'Declaração de enquadramento como microempresa ou empresa de pequeno porte',
    texto: `DECLARAÇÃO DE ENQUADRAMENTO COMO MICROEMPRESA OU EMPRESA DE PEQUENO PORTE

${ABERTURA}, sob as penas da lei, para os fins do disposto no art. 3º da Lei Complementar nº 123, de 14 de dezembro de 2006, que se enquadra na condição de Microempresa (ME) ou Empresa de Pequeno Porte (EPP), não incorrendo em nenhuma das vedações previstas no § 4º do referido artigo, e que atende aos requisitos legais para fazer jus ao tratamento diferenciado e favorecido estabelecido na referida Lei Complementar.

{{CIDADE}}, {{DATA_ASSINATURA}}.

${ASSINATURA}`,
  },
  diversas_habilitacao: {
    titulo: 'Declaração única para fins de habilitação',
    texto: `DECLARAÇÃO ÚNICA PARA FINS DE HABILITAÇÃO

${ABERTURA}, sob as penas da lei, para os fins do disposto no edital desta licitação:

a) que concorda integralmente com os termos deste Edital e de seus anexos, e que tem pleno conhecimento e atendimento das exigências de habilitação nele previstas;

b) nos termos do inciso IV do art. 63 da Lei nº 14.133, de 1º de abril de 2021, que não existe fato superveniente impeditivo de sua habilitação na presente licitação, comprometendo-se a informar à Administração, imediatamente e por escrito, a ocorrência de qualquer fato posterior que venha a impedir sua habilitação;

c) nos termos do inciso XXXIII do art. 7º da Constituição Federal, que não emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre, nem menor de dezesseis anos em qualquer trabalho, salvo na condição de aprendiz, a partir de quatorze anos;

d) nos termos do § 1º do art. 63 da Lei nº 14.133, de 1º de abril de 2021, que a proposta apresentada para esta licitação foi elaborada de maneira independente, e que compreende a integralidade dos custos para atendimento dos direitos trabalhistas assegurados na Constituição Federal, nas leis trabalhistas, nas normas infralegais, nas convenções coletivas de trabalho e nos termos de ajustamento de conduta vigentes na data de entrega das propostas;

e) que cumpre, quando aplicável ao seu quadro de pessoal, a reserva de cargos prevista em lei para pessoa com deficiência e para reabilitado da Previdência Social, e que tem conhecimento das regras previstas no edital a esse respeito;

f) que cumpre, quando aplicável ao seu quadro de pessoal, a cota de aprendizagem prevista em lei;

g) que não possui, em sua cadeia produtiva, empregados executando trabalho degradante ou forçado, observando o disposto nos incisos III e IV do art. 1º e no inciso III do art. 5º da Constituição Federal;

h) que trata os dados pessoais obtidos em razão desta licitação em conformidade com a Lei nº 13.709, de 14 de agosto de 2018 (Lei Geral de Proteção de Dados Pessoais - LGPD), utilizando-os exclusivamente para as finalidades relacionadas a este certame.

{{CIDADE}}, {{DATA_ASSINATURA}}.

${ASSINATURA}`,
  },
}

const MODELO_PROCURACAO = `PROCURAÇÃO PARA REPRESENTAÇÃO EM LICITAÇÃO

OUTORGANTE: {{RAZAO_SOCIAL}}, inscrita no CNPJ sob o nº {{CNPJ}}, com sede em {{ENDERECO}}, neste ato representada por seu(sua) {{CARGO_OUTORGANTE}}, Sr(a). {{OUTORGANTE}}, portador(a) do CPF nº {{CPF_OUTORGANTE}}.

OUTORGADO(A): Sr(a). {{OUTORGADO}}, {{CARGO_OUTORGADO}}, portador(a) do CPF nº {{CPF_OUTORGADO}}.

PODERES: pelo presente instrumento, a OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) seu(sua) procurador(a), conferindo-lhe poderes específicos para representá-la na licitação a seguir identificada: {{OBJETO}}. Para esse fim, poderá credenciar-se, apresentar e assinar a proposta e os documentos de habilitação, assinar declarações, formular lances e ofertas, negociar preços e condições, apresentar documentos, esclarecimentos e a proposta readequada, manifestar a intenção de recorrer, interpor recursos e apresentar contrarrazões, desistir de recursos, assinar atas e praticar todos os atos necessários ao fiel cumprimento deste mandato, vedado o substabelecimento sem autorização por escrito da OUTORGANTE.

Este mandato tem validade de {{VALIDADE}}, a contar da data de sua assinatura.

{{CIDADE}}, {{DATA_ASSINATURA}}.

_______________________________________
{{OUTORGANTE}}
{{CARGO_OUTORGANTE}}
{{RAZAO_SOCIAL}}
CNPJ nº {{CNPJ}}`

export const VALIDADE_PROCURACAO_PADRAO = '12 (doze) meses'
export const AVISO_PADRAO = 'Gerada pelo LicitPro a partir de modelo padrão - confira antes de assinar.'
export const AVISO_TRECHO = 'Gerada a partir do trecho do edital (não há texto padrão para esta declaração) - leia e confira antes de assinar.'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "14 de outubro de 2026". */
export const dataPorExtenso = (data: Date): string => `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`

/** Qual texto padrão cobre uma exigência do edital, pelo título/descrição; `null` se nenhum. */
export const tipoDeDeclaracaoPorNome = (nomeExigencia: string): TipoDeclaracao | null => {
  const n = normalizarParaBusca(nomeExigencia)
  if (/declaracao unica|declaracoes diversas|declaracao (?:geral|conjunta)/.test(n)) return 'diversas_habilitacao'
  if (/fato (?:superveniente )?impeditiv/.test(n)) return 'fato_impeditivo'
  if (/menor|trabalho (?:noturno|insalubre|perigoso)|inciso xxxiii|aprendiz/.test(n)) return 'menor_aprendiz'
  if (/microempresa|\bme\/epp\b|\bme ou epp\b|pequeno porte|lei complementar (?:n\w* )?123|enquadramento/.test(n)) return 'me_epp'
  return null
}

export const ehDeclaracao = (nomeExigencia: string): boolean => /\bdeclara[cç]/i.test(nomeExigencia.normalize('NFC'))

/** Preenche {{CAMPO}}. Campo sem valor é devolvido em `faltando` - o texto nunca sai com marcador ou lacuna. */
export const preencherModelo = (modelo: string, dados: Record<string, string | null | undefined>): { texto: string; faltando: string[] } => {
  const faltando = new Set<string>()
  const texto = modelo.replace(/\{\{([A-Z_]+)\}\}/g, (_todo, campo: string) => {
    const valor = dados[campo]?.trim()
    if (!valor) {
      faltando.add(campo)
      return `{{${campo}}}`
    }
    return valor
  })
  return { texto, faltando: [...faltando] }
}

const ROTULOS_CAMPO: Record<string, string> = {
  RAZAO_SOCIAL: 'razão social da empresa', CNPJ: 'CNPJ da empresa', REPRESENTANTE_LEGAL: 'nome do representante legal',
  CPF_REPRESENTANTE: 'CPF do representante legal', CIDADE: 'cidade (para a linha da data)', DATA_ASSINATURA: 'data da assinatura',
  ENDERECO: 'endereço da sede da empresa', OUTORGANTE: 'nome de quem outorga a procuração', CPF_OUTORGANTE: 'CPF de quem outorga',
  CARGO_OUTORGANTE: 'cargo de quem outorga', OUTORGADO: 'nome do procurador', CPF_OUTORGADO: 'CPF do procurador',
  CARGO_OUTORGADO: 'cargo do procurador', OBJETO: 'objeto da licitação',
}

export interface DadosEmpresaDeclaracao {
  razaoSocial: string | null
  cnpj: string | null
  endereco: string | null
  porte: string | null
  representante: { nome: string; cpf?: string } | null
}

export interface DeclaracaoMontada {
  texto: string
  rodape: string
  nomeArquivo: string
}

export type ResultadoMontagem = { ok: true; declaracao: DeclaracaoMontada } | { ok: false; erro: string }

const falta = (campos: string[]): string => `Faltam dados para gerar o documento: ${campos.map((c) => ROTULOS_CAMPO[c] ?? c).join('; ')}.`

const dadosBase = (empresa: DadosEmpresaDeclaracao, cidade: string, data: Date) => ({
  RAZAO_SOCIAL: empresa.razaoSocial, CNPJ: empresa.cnpj, REPRESENTANTE_LEGAL: empresa.representante?.nome,
  CPF_REPRESENTANTE: empresa.representante?.cpf, CIDADE: cidade, DATA_ASSINATURA: dataPorExtenso(data),
})

export const montarDeclaracaoPadrao = (tipo: TipoDeclaracao, empresa: DadosEmpresaDeclaracao, cidade: string, data: Date): ResultadoMontagem => {
  if (tipo === 'me_epp' && empresa.porte !== 'me' && empresa.porte !== 'epp') {
    return { ok: false, erro: 'A declaração de ME/EPP só é gerada quando o porte cadastrado é ME ou EPP; o cadastro diz outro porte (ou não informa).' }
  }
  const { texto, faltando } = preencherModelo(MODELOS[tipo].texto, dadosBase(empresa, cidade, data))
  if (faltando.length) return { ok: false, erro: falta(faltando) }
  return { ok: true, declaracao: { texto, rodape: AVISO_PADRAO, nomeArquivo: `declaracao-${tipo.replace(/_/g, '-')}.pdf` } }
}

/** Declaração que cita literalmente o que o edital exige, para o que não tem texto padrão. */
export const montarDeclaracaoPeloTrecho = (
  exigencia: { titulo: string; trecho: string; pagina: number | null; clausula: string | null },
  empresa: DadosEmpresaDeclaracao,
  cidade: string,
  data: Date
): ResultadoMontagem => {
  const onde = [exigencia.clausula ? `item ${exigencia.clausula}` : '', exigencia.pagina ? `pág. ${exigencia.pagina}` : ''].filter(Boolean).join(', ')
  // O trecho do edital entra DEPOIS do preenchimento: se ele trouxesse "{{X}}", viraria campo.
  const modelo = `${exigencia.titulo.trim().toUpperCase()}

${ABERTURA}, sob as penas da lei, em atendimento ao edital desta licitação${onde ? ` (${onde})` : ''}, que exige: "@@TRECHO@@".

{{CIDADE}}, {{DATA_ASSINATURA}}.

${ASSINATURA}`
  const { texto, faltando } = preencherModelo(modelo, dadosBase(empresa, cidade, data))
  if (faltando.length) return { ok: false, erro: falta(faltando) }
  return {
    ok: true,
    declaracao: { texto: texto.replace('@@TRECHO@@', () => exigencia.trecho.trim()), rodape: AVISO_TRECHO, nomeArquivo: 'declaracao-do-edital.pdf' },
  }
}

export interface DadosProcuracao {
  empresa: DadosEmpresaDeclaracao
  outorgante: { nome: string; cpf: string; cargo: string }
  outorgado: { nome: string; cpf: string; cargo: string }
  objeto: string
  validade?: string
}

export const montarProcuracao = (dados: DadosProcuracao, cidade: string, data: Date): ResultadoMontagem => {
  const { texto, faltando } = preencherModelo(MODELO_PROCURACAO, {
    RAZAO_SOCIAL: dados.empresa.razaoSocial, CNPJ: dados.empresa.cnpj, ENDERECO: dados.empresa.endereco,
    OUTORGANTE: dados.outorgante.nome, CPF_OUTORGANTE: dados.outorgante.cpf, CARGO_OUTORGANTE: dados.outorgante.cargo,
    OUTORGADO: dados.outorgado.nome, CPF_OUTORGADO: dados.outorgado.cpf, CARGO_OUTORGADO: dados.outorgado.cargo,
    OBJETO: dados.objeto, VALIDADE: dados.validade?.trim() || VALIDADE_PROCURACAO_PADRAO, CIDADE: cidade, DATA_ASSINATURA: dataPorExtenso(data),
  })
  if (faltando.length) return { ok: false, erro: falta(faltando) }
  return {
    ok: true,
    declaracao: {
      texto,
      rodape: 'Procuração gerada pelo LicitPro - confira os dados e peça ao sócio ou administrador que assine. Reconhecimento de firma só se o edital pedir.',
      nomeArquivo: 'procuracao-licitacao.pdf',
    },
  }
}
