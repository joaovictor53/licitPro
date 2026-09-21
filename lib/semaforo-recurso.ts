// lib/semaforo-recurso.ts
// Ferramenta 2, Ficha do Recurso — cálculo do semáforo (verde/amarelo/vermelho).
//
// Regra geral do doc: "Nunca só a cor. Sempre a lista do que gerou aquela
// cor." — por isso a saída é sempre a cor final MAIS a lista de fatores que
// a formaram, nunca só a cor isolada. O semáforo é lógica de negócio pura
// (sem IA): a cor é sempre o pior nível entre os fatores encontrados.

import { FatorSemaforo, IndicadorPagamentoOrgao, InstrumentoRecurso, OrigemRecurso, SemaforoRecurso, SituacaoRecurso } from '@/types/recurso-tipos'

export interface DadosParaSemaforo {
  origem: OrigemRecurso | null
  instrumento: InstrumentoRecurso | null
  situacao: SituacaoRecurso | null
  vigenciaEm: Date | null
  indicadorPagamento: IndicadorPagamentoOrgao
}

// Abaixo disso, a vigência do recurso é considerada apertada frente ao prazo
// de entrega (o edital ainda não modela um campo próprio de "prazo de
// entrega" — essa comparação é uma aproximação até esse dado existir).
const DIAS_VIGENCIA_APERTADA = 60

export const calcularSemaforo = (dados: DadosParaSemaforo): { semaforo: SemaforoRecurso; fatores: FatorSemaforo[] } => {
  const fatores: FatorSemaforo[] = []

  const recursoNaoLocalizado = !dados.origem || dados.origem === 'nao_identificado' || !dados.situacao || dados.situacao === 'nao_localizado'

  if (recursoNaoLocalizado) {
    fatores.push({ nivel: 'vermelho', motivo: 'Recurso não localizado' })
  } else if (dados.instrumento === 'emenda_parlamentar' && dados.situacao === 'apenas_previsto') {
    fatores.push({ nivel: 'vermelho', motivo: 'Emenda parlamentar apenas anunciada, ainda não empenhada' })
  } else if (dados.situacao === 'empenhado' || dados.situacao === 'liquidado' || dados.situacao === 'pago') {
    fatores.push({ nivel: 'verde', motivo: 'Recurso identificado e empenhado' })
  } else if (dados.situacao === 'apenas_previsto') {
    fatores.push({ nivel: 'amarelo', motivo: 'Recurso identificado mas ainda não empenhado' })
  }

  if (dados.vigenciaEm) {
    const diasRestantes = Math.floor((dados.vigenciaEm.getTime() - Date.now()) / 86_400_000)
    if (diasRestantes < 0) {
      fatores.push({ nivel: 'vermelho', motivo: 'Vigência do recurso já encerrada' })
    } else if (diasRestantes <= DIAS_VIGENCIA_APERTADA) {
      fatores.push({ nivel: 'amarelo', motivo: `Vigência termina em ${diasRestantes} dia(s)` })
    } else {
      fatores.push({ nivel: 'verde', motivo: 'Vigência do recurso folgada' })
    }
  }

  if (dados.indicadorPagamento.atrasosRegistrados > 0) {
    fatores.push({
      nivel: 'vermelho',
      motivo: `Órgão com ${dados.indicadorPagamento.atrasosRegistrados} atraso(s) de pagamento registrado(s)`,
    })
  } else if (dados.indicadorPagamento.quantidadeContratos === 0) {
    fatores.push({ nivel: 'amarelo', motivo: 'Órgão sem histórico de pagamento conhecido' })
  } else {
    fatores.push({ nivel: 'verde', motivo: 'Órgão com histórico de pagamento regular' })
  }

  const semaforo: SemaforoRecurso = fatores.some((f) => f.nivel === 'vermelho')
    ? 'vermelho'
    : fatores.some((f) => f.nivel === 'amarelo')
      ? 'amarelo'
      : 'verde'

  return { semaforo, fatores }
}
