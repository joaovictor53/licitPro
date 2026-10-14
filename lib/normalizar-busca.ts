// lib/normalizar-busca.ts
// Minúsculas, sem acento, sem marcação Markdown, espaços colapsados — só para comparar texto
// (portado de normalizar_para_busca do Proposta Certa). Diferente de normalizarParaComparacao
// (lib/texto-blocos.ts), mantém a pontuação, de que as expressões regulares de leitura precisam.

export const normalizarParaBusca = (texto: string): string =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[a-z/][^>]{0,20}>/g, ' ')
    .replace(/[*_#`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
