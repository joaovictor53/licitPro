// lib/alerta-recurso.ts
// Ferramenta 14 — nível de alerta de prazo recursal, calculado ao vivo
// (mesmo padrão dos outros alertas do sistema: nada persistido à parte).
// "O alerta aqui é o mais apertado do sistema" — por isso o limiar de
// urgência é o último dia, não os três dias usados no Envio.

export type NivelAlertaRecurso = 'em_curso' | 'ultimo_dia' | 'vencido' | null

export const calcularNivelAlertaRecurso = (prazo: Date | null, agora: Date = new Date()): NivelAlertaRecurso => {
  if (!prazo) return null
  const diffMs = prazo.getTime() - agora.getTime()
  if (diffMs <= 0) return 'vencido'
  if (diffMs <= 24 * 60 * 60 * 1000) return 'ultimo_dia'
  return 'em_curso'
}
