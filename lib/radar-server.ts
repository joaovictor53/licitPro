// lib/radar-server.ts
// Ferramenta 1, Radar de Editais — combina as fontes disponíveis (PNCP,
// Portal de Compras Públicas), filtra localmente (nenhuma das duas tem busca
// por palavra-chave/CNAE) e persiste os achados como `participacao`.

import { and, asc, eq, gte, inArray, isNull, like } from 'drizzle-orm'
import { db } from '@/app/src'
import { cnaePorObjeto, editalPncp, empresa, participacao, radarConfig } from '@/app/src/db/schema'
import { coletarPncp, DIAS_COLETA } from '@/lib/radar-coleta'
import { buscarContratacoesPcp } from '@/lib/portal-compras-publicas'
import { gerarPalavrasChaveCnae } from '@/lib/cnae-auto-geracao'
import {
  classificarTexto,
  regrasPadrao,
  termosDeBusca,
  type RegrasClassificacao,
  type ResultadoClassificacao,
} from '@/lib/classificacao-radar'
import { buscarDescricoesDosItens, lerNumeroControlePncp, pausaEntreConsultasDeItens } from '@/lib/radar-itens'
import type { ContratacaoRadar, RadarConfig } from '@/types/radar-tipos'

// Tempo que a coleta pode usar dentro de uma requisição (maxDuration da rota é 60s).
const ORCAMENTO_COLETA_MS = 30_000
const ORCAMENTO_ITENS_MS = 15_000
const MAX_REAVALIACOES_POR_EXECUCAO = 8

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// CNAE pode ser digitado com ou sem pontuação (4724-5/00 vs 4724500) — compara
// só os dígitos para não depender de como o operador ou a tabela da Arumã formatou.
const normalizarCnae = (cnae: string): string => cnae.replace(/\D/g, '')

const contemAlgum = (textoNormalizado: string, termos: string[]): boolean =>
  termos.some((termo) => termo.trim() !== '' && textoNormalizado.includes(normalizar(termo)))

/**
 * Resolve as palavras-chave do CNAE da empresa ANTES de buscar nas fontes
 * externas — falha (ou gera) aqui é instantâneo, em vez de só depois de
 * esperar PNCP/PCP responderem.
 *
 * Se o CNAE não estiver em `cnae_por_objeto`, tenta gerar `busca`
 * automaticamente a partir do IBGE (sem revisão humana — ver
 * lib/cnae-auto-geracao.ts) e grava a linha marcada como
 * `curadoManualmente: false`, para a Arumã revisar quando puder.
 */
const resolverPalavrasChaveCnae = async (
  cnaePrincipal: string | null,
  cnaesSecundarios: string[] | null
): Promise<{ busca: string[]; naoTraz: string[]; geradoAgora: boolean }> => {
  const cnaes = [cnaePrincipal, ...(cnaesSecundarios ?? [])].filter((c): c is string => Boolean(c))
  if (cnaes.length === 0) {
    throw new Error('Cadastre o CNAE principal da empresa em Perfil antes de usar a busca por CNAE.')
  }

  // MVP: só o CNAE principal — cobrir secundários é extensão direta deste loop.
  const cnaeAlvo = normalizarCnae(cnaes[0])
  const todasAsLinhas = await db.select().from(cnaePorObjeto)
  const linha = todasAsLinhas.find((l) => normalizarCnae(l.cnae) === cnaeAlvo)

  if (linha) {
    return { busca: linha.busca, naoTraz: linha.naoTraz, geradoAgora: false }
  }

  const gerado = await gerarPalavrasChaveCnae(cnaes[0])
  if (!gerado) {
    throw new Error(
      `Não foi possível gerar palavras-chave para o CNAE ${cnaes[0]} agora (código inválido ou IBGE fora do ar). Tente novamente ou use a busca livre.`
    )
  }

  const [linhaGerada] = await db
    .insert(cnaePorObjeto)
    .values({
      cnae: gerado.cnae,
      descricao: gerado.descricao,
      busca: gerado.busca,
      naoTraz: [],
      curadoManualmente: false,
    })
    .onConflictDoNothing({ target: cnaePorObjeto.cnae })
    .returning()

  if (linhaGerada) {
    return { busca: linhaGerada.busca, naoTraz: linhaGerada.naoTraz, geradoAgora: true }
  }

  // Corrida rara: outra requisição gerou/gravou este CNAE entre o select e o insert.
  const [linhaConcorrente] = await db
    .select()
    .from(cnaePorObjeto)
    .where(eq(cnaePorObjeto.cnae, gerado.cnae))
    .limit(1)

  return {
    busca: linhaConcorrente?.busca ?? gerado.busca,
    naoTraz: linhaConcorrente?.naoTraz ?? [],
    geradoAgora: true,
  }
}

const dentroDaFaixa = (c: ContratacaoRadar, faixaMin: number | null, faixaMax: number | null): boolean => {
  if (faixaMin != null && (c.valorEstimado == null || c.valorEstimado < faixaMin)) return false
  if (faixaMax != null && (c.valorEstimado == null || c.valorEstimado > faixaMax)) return false
  return true
}

interface Classificada {
  contratacao: ContratacaoRadar
  resultado: ResultadoClassificacao
}

/** Mantém relevantes e "talvez"; só o irrelevante é descartado. */
const classificarContratacoes = (contratacoes: ContratacaoRadar[], regras: RegrasClassificacao): Classificada[] =>
  contratacoes
    .filter((c) => (c.objeto ?? '').trim() !== '')
    .map((c) => ({ contratacao: c, resultado: classificarTexto(c.objeto!, regras) }))
    .filter((c) => c.resultado.categoria !== 'irrelevante')

/**
 * "Talvez" ainda sem itens consultados: busca a descrição dos itens no PNCP e
 * reclassifica objeto + itens. Poucos por execução (cada consulta é uma
 * chamada à API); o resto fica para a próxima.
 */
const reavaliarPelosItens = async (empresaId: string, regras: RegrasClassificacao, orcamentoMs: number) => {
  const limite = Date.now() + orcamentoMs
  const candidatas = await db
    .select()
    .from(participacao)
    .where(and(
      eq(participacao.empresaId, empresaId),
      eq(participacao.categoriaRadar, 'talvez'),
      isNull(participacao.itensConsultadosEm),
      like(participacao.numeroControlePncp, 'pncp:%'),
    ))
    .limit(MAX_REAVALIACOES_POR_EXECUCAO)

  let reavaliadas = 0
  let promovidas = 0
  let descartadas = 0

  for (const p of candidatas) {
    if (Date.now() >= limite) break
    const chave = lerNumeroControlePncp(p.numeroControlePncp ?? '')
    if (!chave) continue

    const descricoes = await buscarDescricoesDosItens(chave)
    // Falha de rede não marca como consultado: tenta de novo na próxima.
    if (descricoes === null) {
      await pausaEntreConsultasDeItens()
      continue
    }

    const resultado = classificarTexto(`${p.objeto} ${descricoes.join(' ')}`, regras)
    await db
      .update(participacao)
      .set({
        categoriaRadar: resultado.categoria,
        notaRadar: resultado.nota,
        termosRadar: resultado.termosEncontrados,
        itensConsultadosEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(participacao.id, p.id))

    reavaliadas++
    if (resultado.categoria === 'relevante') promovidas++
    if (resultado.categoria === 'irrelevante') descartadas++
    await pausaEntreConsultasDeItens()
  }

  return { reavaliadas, promovidas, descartadas }
}

const filtrarPorOrgaos = (
  contratacoes: ContratacaoRadar[],
  incluir: string[],
  excluir: string[]
): ContratacaoRadar[] =>
  contratacoes.filter((c) => {
    const orgao = normalizar(c.orgao ?? '')
    if (incluir.length > 0 && !contemAlgum(orgao, incluir)) return false
    if (excluir.length > 0 && contemAlgum(orgao, excluir)) return false
    return true
  })

/** Executa o radar para uma empresa: busca nas fontes disponíveis, filtra e grava os achados novos. */
export const executarRadar = async (empresaId: string, criadoPorUserId: string, config: RadarConfig) => {
  if (config.estados.length === 0) {
    throw new Error('Selecione ao menos um estado para ativar o radar.')
  }

  // Tudo que pode ser validado sem depender de PNCP/PCP fica aqui — falha
  // rápido, sem gastar 20-30s numa busca cujo resultado já sabíamos que ia
  // ser descartado (CNAE sem cadastro, busca livre sem texto).
  let palavrasChaveCnae: { busca: string[]; naoTraz: string[]; geradoAgora: boolean } | null = null
  if (config.modoBusca === 'livre') {
    if (!config.textoLivre?.trim()) throw new Error('Informe o que procurar na busca livre.')
  } else {
    const [dadosEmpresa] = await db.select().from(empresa).where(eq(empresa.id, empresaId)).limit(1)
    palavrasChaveCnae = await resolverPalavrasChaveCnae(dadosEmpresa?.cnaePrincipal ?? null, dadosEmpresa?.cnaesSecundarios ?? null)
  }

  // 1) Coleta incremental: só o que ainda falta (janelas completas do passado
  //    são puladas). O PCP continua inerte até a publicKey ser configurada.
  const [coleta, pcp] = await Promise.all([
    coletarPncp({ ufs: config.estados, orcamentoMs: ORCAMENTO_COLETA_MS }),
    buscarContratacoesPcp(config.estados),
  ])

  // 2) A busca lê da cópia local: mesmo que a coleta tenha ficado incompleta,
  //    o que já foi coletado antes continua disponível.
  const desde = new Date(Date.now() - DIAS_COLETA * 86_400_000)
  const locais = await db
    .select()
    .from(editalPncp)
    .where(and(inArray(editalPncp.uf, config.estados), gte(editalPncp.dataPublicacaoPncp, desde)))

  const doPncp: ContratacaoRadar[] = locais.map((e) => ({
    identificadorExterno: e.numeroControlePncp,
    fonte: 'pncp',
    orgao: e.orgao,
    municipio: e.municipio,
    uf: e.uf,
    objeto: e.objeto,
    valorEstimado: e.valorEstimado != null ? Number(e.valorEstimado) : null,
    modalidade: e.modalidade,
    numeroProcesso: e.numeroProcesso,
    dataSessaoEm: e.dataAberturaProposta ? e.dataAberturaProposta.toISOString() : null,
    linkPortalOrigem: e.linkOrigem,
  }))

  const brutos = [...doPncp, ...pcp.resultados]
  const falhas = [...coleta.falhas, ...pcp.falhas]

  if (brutos.length === 0 && coleta.erros > 0) {
    throw new Error(
      'Nenhuma fonte respondeu agora (instabilidade conhecida do PNCP, por exemplo). Tente novamente em alguns minutos.'
    )
  }

  const regras: RegrasClassificacao =
    config.modoBusca === 'livre'
      ? regrasPadrao([{ termo: config.textoLivre!.trim(), peso: 2 }], [])
      : regrasPadrao(termosDeBusca(palavrasChaveCnae!.busca), palavrasChaveCnae!.naoTraz)

  const candidatosPorValor =
    config.modoBusca === 'livre'
      ? brutos.filter((c) => dentroDaFaixa(c, config.faixaValorMin, config.faixaValorMax))
      : brutos

  const classificadas = classificarContratacoes(candidatosPorValor, regras)
  const porOrgao = filtrarPorOrgaos(classificadas.map((c) => c.contratacao), config.orgaosIncluir, config.orgaosExcluir)
  const permitidos = new Set(porOrgao)
  const filtrados = classificadas.filter((c) => permitidos.has(c.contratacao))

  const novosIds: string[] = []
  for (const { contratacao: c, resultado } of filtrados) {
    if (!c.identificadorExterno || !c.objeto) continue

    const inserido = await db
      .insert(participacao)
      .values({
        empresaId,
        criadoPorUserId,
        estado: 'identificada',
        // Prefixo pela fonte: identificadores de fontes diferentes (PNCP,
        // Portal de Compras Públicas) usam formatos distintos e compartilham
        // esta coluna — o prefixo evita colisão entre eles.
        numeroControlePncp: `${c.fonte}:${c.identificadorExterno}`,
        orgao: c.orgao ?? 'Não informado',
        municipio: c.municipio,
        uf: c.uf,
        esfera: config.esfera ?? undefined,
        objeto: c.objeto,
        modalidade: c.modalidade,
        numeroProcesso: c.numeroProcesso,
        valorEstimado: c.valorEstimado != null ? String(c.valorEstimado) : null,
        dataSessaoEm: c.dataSessaoEm ? new Date(c.dataSessaoEm) : null,
        fusoEdital: 'America/Sao_Paulo',
        linkPortalOrigem: c.linkPortalOrigem,
        categoriaRadar: resultado.categoria,
        notaRadar: resultado.nota,
        termosRadar: resultado.termosEncontrados,
      })
      .onConflictDoNothing({ target: [participacao.empresaId, participacao.numeroControlePncp] })
      .returning({ id: participacao.id })

    if (inserido.length > 0) novosIds.push(inserido[0].id)
  }

  const itens = await reavaliarPelosItens(empresaId, regras, ORCAMENTO_ITENS_MS)

  await db
    .update(radarConfig)
    .set({ ultimaExecucaoEm: new Date() })
    .where(eq(radarConfig.empresaId, empresaId))

  const avisos: string[] = []
  if (coleta.restantes > 0) {
    avisos.push(
      `A coleta do PNCP ainda não cobriu todo o período (${coleta.restantes} janela(s) pendente(s)${falhas.length > 0 ? `, ${falhas.length} com falha` : ''}). Execute o radar de novo para continuar de onde parou.`
    )
  }
  if (palavrasChaveCnae?.geradoAgora) {
    avisos.push(
      'Palavras-chave deste CNAE foram geradas automaticamente agora (sem revisão da Arumã) — os resultados podem ter mais ruído até alguém revisar.'
    )
  }

  return {
    encontrados: filtrados.length,
    coleta: { gravados: coleta.gravados, restantes: coleta.restantes },
    itens,
    novos: novosIds.length,
    novosIds,
    aviso: avisos.length > 0 ? avisos.join(' ') : null,
  }
}

/** Lista as participações do radar (ainda não decididas) ordenadas pela sessão mais próxima. */
export const listarParticipacoesDoRadar = (empresaId: string) =>
  db
    .select()
    .from(participacao)
    .where(and(
      eq(participacao.empresaId, empresaId),
      inArray(participacao.estado, ['identificada', 'em_triagem']),
    ))
    .orderBy(asc(participacao.dataSessaoEm))
