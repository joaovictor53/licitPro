// lib/radar-coleta.ts
// Coleta do PNCP em janelas retomáveis (porte da ideia do Caçador): cada
// janela × UF × modalidade vira uma linha em `radar_varredura`. Se o tempo
// da requisição acaba, o que ficou para trás é marcado como incompleto e a
// próxima execução continua de onde parou. Os editais vão para `edital_pncp`,
// compartilhado entre empresas; a classificação por empresa vem depois.

import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/app/src'
import { editalPncp, radarVarredura } from '@/app/src/db/schema'
import { ATRASO_ENTRE_CHAMADAS_MS, MODALIDADES_RADAR, aguardar, buscarPaginaPncp, mapearParaContratacaoRadar } from '@/lib/pncp'
import {
  chaveDaVarredura,
  formatarDataPncp,
  planejarVarreduras,
  type ChaveVarredura,
  type StatusVarredura,
} from '@/lib/janelas-coleta'
import type { ContratacaoRadar } from '@/types/radar-tipos'

export const DIAS_COLETA = 60
export const TAMANHO_JANELA_DIAS = 7
// Teto de páginas (de 50) por varredura e por execução. Passou disso, fica
// incompleta e a próxima execução continua da página seguinte.
const MAX_PAGINAS_POR_VARREDURA = 40
const FONTE = 'pncp'

export interface ResultadoColeta {
  gravados: number
  completas: number
  incompletas: number
  erros: number
  /** Varreduras que ainda faltam depois desta execução (0 = cobertura total). */
  restantes: number
  falhas: string[]
}

const paraData = (valor: string | null | undefined): Date | null => {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export const contratacaoParaLinha = (c: ContratacaoRadar) => ({
  numeroControlePncp: c.identificadorExterno,
  orgaoCnpj: c.orgaoCnpj ?? null,
  orgao: c.orgao,
  municipio: c.municipio,
  uf: c.uf,
  objeto: c.objeto,
  valorEstimado: c.valorEstimado != null ? String(c.valorEstimado) : null,
  modalidade: c.modalidade,
  numeroProcesso: c.numeroProcesso,
  dataAberturaProposta: paraData(c.dataSessaoEm),
  dataEncerramentoProposta: paraData(c.dataEncerramentoProposta),
  dataPublicacaoPncp: paraData(c.dataPublicacaoPncp),
  linkOrigem: c.linkPortalOrigem,
})

export const gravarEditais = async (contratacoes: ContratacaoRadar[]): Promise<number> => {
  const linhas = contratacoes.filter((c) => c.identificadorExterno).map(contratacaoParaLinha)
  if (linhas.length === 0) return 0

  await db
    .insert(editalPncp)
    .values(linhas)
    .onConflictDoUpdate({
      target: editalPncp.numeroControlePncp,
      set: {
        orgaoCnpj: sql`excluded.orgao_cnpj`,
        orgao: sql`excluded.orgao`,
        municipio: sql`excluded.municipio`,
        uf: sql`excluded.uf`,
        objeto: sql`excluded.objeto`,
        valorEstimado: sql`excluded.valor_estimado`,
        modalidade: sql`excluded.modalidade`,
        numeroProcesso: sql`excluded.numero_processo`,
        dataAberturaProposta: sql`excluded.data_abertura_proposta`,
        dataEncerramentoProposta: sql`excluded.data_encerramento_proposta`,
        dataPublicacaoPncp: sql`excluded.data_publicacao_pncp`,
        linkOrigem: sql`excluded.link_origem`,
        atualizadoEm: new Date(),
      },
    })
  return linhas.length
}

const registrarVarredura = async (
  chave: ChaveVarredura,
  dados: { status: StatusVarredura; paginasLidas: number; totalPaginas: number | null; totalRegistros: number | null; erro: string | null }
) => {
  await db
    .insert(radarVarredura)
    .values({
      fonte: FONTE,
      uf: chave.uf,
      modalidade: chave.modalidade,
      dataInicial: chave.inicial,
      dataFinal: chave.final,
      ...dados,
    })
    .onConflictDoUpdate({
      target: [radarVarredura.fonte, radarVarredura.uf, radarVarredura.modalidade, radarVarredura.dataInicial, radarVarredura.dataFinal],
      set: { ...dados, executadoEm: new Date() },
    })
}

const carregarRegistradas = async (ufs: string[]) => {
  const linhas = await db
    .select()
    .from(radarVarredura)
    .where(and(eq(radarVarredura.fonte, FONTE), inArray(radarVarredura.uf, ufs)))

  const status = new Map<string, StatusVarredura>()
  const paginas = new Map<string, number>()
  for (const l of linhas) {
    const chave = chaveDaVarredura({ uf: l.uf, modalidade: l.modalidade, inicial: l.dataInicial, final: l.dataFinal })
    status.set(chave, l.status as StatusVarredura)
    paginas.set(chave, l.paginasLidas)
  }
  return { status, paginas }
}

/**
 * Coleta o que ainda falta, dentro do orçamento de tempo. Janelas completas
 * do passado são puladas; a janela de hoje é sempre refeita.
 */
export const coletarPncp = async (params: {
  ufs: string[]
  orcamentoMs: number
  dias?: number
  refazer?: boolean
}): Promise<ResultadoColeta> => {
  const limite = Date.now() + params.orcamentoMs
  const hoje = new Date()
  const hojeTexto = formatarDataPncp(hoje)
  const modalidades = MODALIDADES_RADAR.map((m) => m.codigo as number)

  const { status: registradas, paginas: paginasAnteriores } = await carregarRegistradas(params.ufs)
  const pendentes = planejarVarreduras({
    hoje,
    dias: params.dias ?? DIAS_COLETA,
    tamanhoJanela: TAMANHO_JANELA_DIAS,
    ufs: params.ufs,
    modalidades,
    registradas,
    refazer: params.refazer,
  })

  const resultado: ResultadoColeta = { gravados: 0, completas: 0, incompletas: 0, erros: 0, restantes: 0, falhas: [] }
  let processadas = 0

  for (const chave of pendentes) {
    if (Date.now() >= limite) break
    processadas++
    const chaveTexto = chaveDaVarredura(chave)

    // Continua da página seguinte só quando a janela já fechou e ficou incompleta;
    // na janela de hoje as páginas deslizam com novas publicações.
    const retomavel =
      registradas.get(chaveTexto) === 'incompleta' && chave.final < hojeTexto && !params.refazer
    const paginaInicial = retomavel ? (paginasAnteriores.get(chaveTexto) ?? 0) + 1 : 1

    let pagina = paginaInicial
    let lidas = paginaInicial - 1
    let totalPaginas: number | null = null
    let totalRegistros: number | null = null
    let situacao: StatusVarredura = 'completa'
    let erro: string | null = null

    while (true) {
      if (Date.now() >= limite || pagina - paginaInicial >= MAX_PAGINAS_POR_VARREDURA) {
        situacao = 'incompleta'
        break
      }
      try {
        const resposta = await buscarPaginaPncp({
          rota: 'publicacao',
          uf: chave.uf,
          codigoModalidadeContratacao: chave.modalidade,
          dataInicial: chave.inicial,
          dataFinal: chave.final,
          pagina,
        })
        totalPaginas = resposta.totalPaginas
        totalRegistros = resposta.totalRegistros
        resultado.gravados += await gravarEditais(resposta.data.map(mapearParaContratacaoRadar))
        lidas = pagina
        if (pagina >= resposta.totalPaginas || resposta.data.length === 0) break
        pagina++
      } catch (e) {
        situacao = 'erro'
        erro = e instanceof Error ? e.message : String(e)
        resultado.falhas.push(erro)
        break
      }
      await aguardar(ATRASO_ENTRE_CHAMADAS_MS)
    }

    await registrarVarredura(chave, { status: situacao, paginasLidas: lidas, totalPaginas, totalRegistros, erro })
    if (situacao === 'completa') resultado.completas++
    else if (situacao === 'incompleta') resultado.incompletas++
    else resultado.erros++
    await aguardar(ATRASO_ENTRE_CHAMADAS_MS)
  }

  // Quem não foi tocado + quem foi tocado mas não fechou.
  resultado.restantes = pendentes.length - processadas + resultado.incompletas + resultado.erros
  return resultado
}
