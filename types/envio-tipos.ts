// types/envio-tipos.ts
// Ferramenta 10, Envio.
//
// "Prazo de validade da proposta atende o mínimo" e "prazo de entrega dentro
// do admitido" ficam fora da conferência final (mesma lacuna documentada na
// Ferramenta 8: a Ferramenta 3 ainda não estrutura esses dois prazos como
// campos comparáveis). O sistema nunca envia — o envio é sempre manual, no
// portal, com a credencial da empresa; aqui só confere e registra o protocolo.

export interface ConferenciaFinalEnvio {
  ok: boolean
  pendencias: string[]
}

export type NivelAlertaPrazoEnvio = 'importante' | 'critico' | 'urgente' | 'bloqueante' | null
