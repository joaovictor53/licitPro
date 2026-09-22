// lib/alerta-prazo-envio.ts
// Ferramenta 10 — nível de alerta do prazo de envio (calculado ao vivo, não
// persistido, igual aos alertas da Decisão de Participar).

import { NivelAlertaPrazoEnvio } from '@/types/envio-tipos'

export const calcularNivelAlertaPrazoEnvio = (prazoFinalEnvioEm: Date | null, agora: Date = new Date()): NivelAlertaPrazoEnvio => {
  if (!prazoFinalEnvioEm) return null
  const diffMs = prazoFinalEnvioEm.getTime() - agora.getTime()
  if (diffMs <= 0) return 'bloqueante'
  if (diffMs <= 6 * 60 * 60 * 1000) return 'urgente'
  if (diffMs <= 24 * 60 * 60 * 1000) return 'critico'
  if (diffMs <= 3 * 24 * 60 * 60 * 1000) return 'importante'
  return null
}
