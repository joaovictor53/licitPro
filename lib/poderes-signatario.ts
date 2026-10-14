// lib/poderes-signatario.ts
// Quem assina a proposta e as declarações. Portado de app/poderes_signatario.py do Proposta Certa.
// Decide só pelo cadastro (nunca por suposição) e nunca assina por ninguém:
//  - sócio/administrador: o poder vem do contrato social, pode assinar;
//  - precisa de procuração: o poder vem de procuração, ou o cargo não é de sócio/administrador;
//  - não pode assinar: retirante, falecido, desligado...;
//  - faltam dados: sem CPF ou sem a descrição dos poderes.
// O cadastro do LicitPro guarda os poderes em texto livre (`representanteLegal.poderes`), então
// o cargo e a origem do poder são lidos dele.

import type { RepresentanteLegal } from '@/types/empresa-tipos'
import { normalizarParaBusca } from '@/lib/normalizar-busca'

export type SituacaoSignatario = 'socio_administrador' | 'precisa_procuracao' | 'nao_pode_assinar' | 'faltam_dados' | 'sem_representante'

export interface Signatario {
  situacao: SituacaoSignatario
  mensagem: string
}

const RE_SOCIO_OU_ADMINISTRADOR =
  /(?<![a-z])(?:socio|socia|administrador|administradora|diretor|diretora|presidente|titular|proprietario|proprietaria|dono|dona|empresario|empresaria|socio[\s-]*gerente|socio[\s-]*administrador)(?![a-z])/
const RE_NAO_E_SOCIO =
  /(?<![a-z])(?:procurador|procuradora|mandatario|mandataria|preposto|preposta|assessor|assessora|analista|consultor|consultora|despachante|representante\s+comercial|funcionario|funcionaria|colaborador|colaboradora)(?![a-z])/
// "administrador financeiro" é cargo de área, não o administrador da sociedade.
const RE_ADMINISTRADOR_DE_AREA =
  /(?<![a-z])administrador[a]?(?:\s+(?:de|do|da|dos|das)\s+[a-z]+|\s+(?:financeir[oa]|comercial|judicial|administrativ[oa]|operacional|tecnic[oa]|contabil|fiscal|de\s+rede|de\s+sistemas?))(?![a-z])/
const RE_NAO_ASSINA = /(?<![a-z])(?:retirante|retirad[oa]|falecid[oa]|demitid[oa]|desligad[oa]|afastad[oa]|ex[\s-]+[a-z])/
const RE_PROCURACAO = /procura[cç]/

export const avaliarSignatario = (representante: RepresentanteLegal | null | undefined): Signatario => {
  if (!representante?.nome?.trim()) {
    return { situacao: 'sem_representante', mensagem: 'Nenhum representante legal cadastrado: informe quem assina a proposta e as declarações.' }
  }
  const nome = representante.nome.trim()
  const poderes = normalizarParaBusca(representante.poderes ?? '')

  if (RE_NAO_ASSINA.test(poderes)) {
    return { situacao: 'nao_pode_assinar', mensagem: `${nome} (${representante.poderes}) não representa mais a empresa: não pode assinar proposta nem declaração.` }
  }
  const faltam = [!representante.cpf?.trim() && 'CPF', !poderes && 'poderes'].filter(Boolean)
  if (faltam.length) return { situacao: 'faltam_dados', mensagem: `${nome}: faltam ${faltam.join(' e ')} no cadastro.` }

  if (RE_PROCURACAO.test(poderes) || RE_NAO_E_SOCIO.test(poderes)) {
    return { situacao: 'precisa_procuracao', mensagem: `${nome} não é sócio nem administrador (${representante.poderes}): precisa de procuração.` }
  }
  if (RE_SOCIO_OU_ADMINISTRADOR.test(poderes.replace(RE_ADMINISTRADOR_DE_AREA, ' '))) {
    return { situacao: 'socio_administrador', mensagem: `${nome} assina como ${representante.poderes}: o poder vem do contrato social.` }
  }
  return {
    situacao: 'precisa_procuracao',
    mensagem: `Não consta que ${nome} seja sócio ou administrador (${representante.poderes}): confirme no contrato social, ou use procuração.`,
  }
}
