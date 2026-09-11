// lib/radar-server.ts
// Ferramenta 1, Radar de Editais — combina as fontes disponíveis (PNCP,
// Portal de Compras Públicas), filtra localmente (nenhuma das duas tem busca
// por palavra-chave/CNAE) e persiste os achados como `participacao`.

import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/app/src'
import { cnaePorObjeto, empresa, participacao, radarConfig } from '@/app/src/db/schema'
import { buscarContratacoesPncp } from '@/lib/pncp'
import { buscarContratacoesPcp } from '@/lib/portal-compras-publicas'
import { gerarPalavrasChaveCnae } from '@/lib/cnae-auto-geracao'
import type { ContratacaoRadar, RadarConfig } from '@/types/radar-tipos'

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

const filtrarPorCnae = (
  contratacoes: ContratacaoRadar[],
  busca: string[],
  naoTraz: string[]
): ContratacaoRadar[] =>
  contratacoes.filter((c) => {
    const objeto = normalizar(c.objeto ?? '')
    if (objeto === '') return false
    return contemAlgum(objeto, busca) && !contemAlgum(objeto, naoTraz)
  })

const filtrarPorTextoLivre = (
  contratacoes: ContratacaoRadar[],
  texto: string,
  faixaMin: number | null,
  faixaMax: number | null
): ContratacaoRadar[] => {
  const alvo = normalizar(texto)
  return contratacoes.filter((c) => {
    const objeto = normalizar(c.objeto ?? '')
    if (!objeto.includes(alvo)) return false
    const valor = c.valorEstimado
    if (faixaMin != null && (valor == null || valor < faixaMin)) return false
    if (faixaMax != null && (valor == null || valor > faixaMax)) return false
    return true
  })
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

  const [pncp, pcp] = await Promise.all([
    buscarContratacoesPncp(config.estados),
    buscarContratacoesPcp(config.estados), // inerte (retorna vazio) até a publicKey ser configurada
  ])

  const brutos = [...pncp.resultados, ...pcp.resultados]
  const chamadas = pncp.chamadas + pcp.chamadas
  const falhas = [...pncp.falhas, ...pcp.falhas]

  if (chamadas > 0 && falhas.length === chamadas) {
    throw new Error(
      'Nenhuma fonte respondeu agora (instabilidade conhecida do PNCP, por exemplo). Tente novamente em alguns minutos.'
    )
  }

  const filtradosPorObjeto: ContratacaoRadar[] =
    config.modoBusca === 'livre'
      ? filtrarPorTextoLivre(brutos, config.textoLivre!, config.faixaValorMin, config.faixaValorMax)
      : filtrarPorCnae(brutos, palavrasChaveCnae!.busca, palavrasChaveCnae!.naoTraz)

  const filtrados = filtrarPorOrgaos(filtradosPorObjeto, config.orgaosIncluir, config.orgaosExcluir)

  const novosIds: string[] = []
  for (const c of filtrados) {
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
      })
      .onConflictDoNothing({ target: [participacao.empresaId, participacao.numeroControlePncp] })
      .returning({ id: participacao.id })

    if (inserido.length > 0) novosIds.push(inserido[0].id)
  }

  await db
    .update(radarConfig)
    .set({ ultimaExecucaoEm: new Date() })
    .where(eq(radarConfig.empresaId, empresaId))

  const avisos: string[] = []
  if (falhas.length > 0) avisos.push(`${falhas.length} de ${chamadas} consulta(s) falharam — a lista pode estar incompleta.`)
  if (palavrasChaveCnae?.geradoAgora) {
    avisos.push(
      'Palavras-chave deste CNAE foram geradas automaticamente agora (sem revisão da Arumã) — os resultados podem ter mais ruído até alguém revisar.'
    )
  }

  return {
    encontrados: filtrados.length,
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
