// lib/preparo-upload.ts
// Ferramenta 11, Preparação do Arquivo para Upload — cálculo puro sobre os
// arquivos que o sistema realmente gera com bytes (planilha de preços e
// proposta comercial). Documentos do dossiê (certidões, atestados etc.) não
// entram aqui: hoje são texto/link (Ferramenta 6), sem arquivo binário
// guardado — por isso não há o que conferir tamanho/formato/nome deles.
// Compressão e fracionamento automático de PDF também ficam fora deste MVP
// (biblioteca de compressão de PDF não faz parte do projeto ainda).

export interface ArquivoParaPreparar {
  peca: string
  nomeOriginal: string
  tamanhoBytes: number
  formato: 'PDF' | 'XLSX'
}

export interface PlataformaRegras {
  nome: string
  tamanhoMaximoMb: number | null
  formatosAceitos: string[]
}

export type SituacaoArquivoUpload = 'pronto' | 'renomeado' | 'excede_fracionar' | 'formato_nao_aceito'

export interface ArquivoPreparado {
  peca: string
  nomeOriginal: string
  nomePreparado: string
  tamanhoBytes: number
  formato: string
  situacao: SituacaoArquivoUpload
  avisos: string[]
}

// Remove acento, cedilha, til, espaço e caractere especial — "a causa mais
// comum de upload rejeitado" segundo o próprio doc do produto.
export const sanitizarNomeArquivo = (nome: string): string => {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return semAcento
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
    .toLowerCase()
}

export const prepararArquivo = (arquivo: ArquivoParaPreparar, plataforma: PlataformaRegras | null): ArquivoPreparado => {
  const avisos: string[] = []
  const nomePreparado = sanitizarNomeArquivo(arquivo.nomeOriginal)
  let situacao: SituacaoArquivoUpload = nomePreparado !== arquivo.nomeOriginal ? 'renomeado' : 'pronto'

  if (plataforma?.tamanhoMaximoMb != null) {
    const tamanhoMb = arquivo.tamanhoBytes / (1024 * 1024)
    if (tamanhoMb > plataforma.tamanhoMaximoMb) {
      situacao = 'excede_fracionar'
      avisos.push(`Excede o limite de ${plataforma.tamanhoMaximoMb} MB da plataforma (${tamanhoMb.toFixed(1)} MB) — fracionamento automático não é feito pelo sistema ainda; separe manualmente.`)
    }
  } else if (plataforma) {
    avisos.push('Limite de tamanho desta plataforma não está confirmado no cadastro — confira manualmente antes de enviar.')
  }

  if (plataforma && plataforma.formatosAceitos.length > 0 && !plataforma.formatosAceitos.includes(arquivo.formato)) {
    situacao = 'formato_nao_aceito'
    avisos.push(`Formato ${arquivo.formato} não está na lista de formatos aceitos desta plataforma (${plataforma.formatosAceitos.join(', ')}).`)
  }

  return { peca: arquivo.peca, nomeOriginal: arquivo.nomeOriginal, nomePreparado, tamanhoBytes: arquivo.tamanhoBytes, formato: arquivo.formato, situacao, avisos }
}
