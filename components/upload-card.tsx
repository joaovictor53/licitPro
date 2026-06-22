// components/upload-card.tsx
'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface UploadCardProps {
  label: string
  etapa: string
  arquivo: File | null
  onArquivo: (file: File) => void
  erro?: string
}

const LIMITE_TAMANHO = 30 * 1024 * 1024 // 30MB
const AVISO_TAMANHO = 10 * 1024 * 1024 // 10MB — acima disso exibe aviso

const formatarTamanho = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const UploadCard = ({ label, etapa, arquivo, onArquivo, erro }: UploadCardProps) => {
  const onDrop = useCallback(
    (arquivosAceitos: File[]) => {
      if (arquivosAceitos[0]) onArquivo(arquivosAceitos[0])
    },
    [onArquivo]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: LIMITE_TAMANHO,
  })

  const arquivoGrande = arquivo && arquivo.size > AVISO_TAMANHO

  const getBorderClasses = () => {
    if (arquivo) return 'border-emerald-400 bg-emerald-50/50'
    if (erro) return 'border-red-400 bg-red-50/50'
    if (isDragActive) return 'border-blue-400 bg-blue-50/50'
    return 'border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          {etapa} — {label}
        </p>

        <div
          {...getRootProps()}
          className={`flex flex-col items-center gap-2 p-6 border-2 rounded-lg cursor-pointer transition-all duration-150 ${getBorderClasses()}`}
        >
          <input {...getInputProps()} aria-label={`Carregar ${label}`} />

          {arquivo ? (
            <>
              <CheckCircle className="w-7 h-7 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 text-center break-all leading-snug">
                {arquivo.name}
              </span>
              <span className="text-xs text-emerald-500">{formatarTamanho(arquivo.size)}</span>
            </>
          ) : erro ? (
            <>
              <AlertCircle className="w-7 h-7 text-red-500" />
              <span className="text-sm text-red-600 text-center leading-snug">{erro}</span>
            </>
          ) : (
            <>
              <FileText className="w-7 h-7 text-slate-400" />
              <span className="text-sm text-slate-500 text-center leading-snug">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o PDF ou clique para selecionar'}
              </span>
              <span className="text-xs text-slate-400">PDF · Até 30 MB</span>
            </>
          )}
        </div>
      </div>

      {/* Avisos após o card */}
      {arquivoGrande && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Arquivo grande ({formatarTamanho(arquivo.size)}). Documentos muito extensos podem ser
            truncados. Considere enviar apenas as seções relevantes do edital.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          O PDF deve conter texto selecionável. PDFs escaneados (imagens) sem OCR não serão
          processados corretamente.
        </p>
      </div>
    </div>
  )
}
