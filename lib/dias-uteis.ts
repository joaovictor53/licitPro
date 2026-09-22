// lib/dias-uteis.ts
// Regra Geral 14 pede calendário de dias úteis com feriado municipal — não
// há fonte de dado de feriados no projeto ainda (tarefa de verificação
// prévia não feita), então este cálculo só pula sábado e domingo. Documentado
// como limitação, não escondido: prazos podem cair um dia errado em feriado
// municipal/estadual/nacional não contemplado.

export const adicionarDiasUteis = (data: Date, dias: number): Date => {
  const resultado = new Date(data)
  let restantes = dias
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1)
    const diaSemana = resultado.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) restantes--
  }
  return resultado
}
