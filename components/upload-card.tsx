// components/upload-card.tsx
'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    if (arquivo) return 'border-amber-400 bg-amber-50/50'
    if (erro) return 'border-destructive bg-destructive/5'
    if (isDragActive) return 'border-primary bg-primary/5'
    return 'border-dashed border-border hover:border-primary hover:bg-primary/5'
  }

  return (
    <div className="flex flex-col gap-2">
      <Card size="sm">
        <CardHeader>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {etapa} — {label}
          </p>
        </CardHeader>

        <CardContent>
          <div
            {...getRootProps()}
            className={`flex flex-col items-center gap-2 p-6 border-2 rounded-lg cursor-pointer transition-all duration-150 ${getBorderClasses()}`}
          >
            <input {...getInputProps()} aria-label={`Carregar ${label}`} />

            {arquivo ? (
              <>
                <CheckCircle className="w-7 h-7 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 text-center break-all leading-snug">
                  {arquivo.name}
                </span>
                <span className="text-xs text-amber-600">{formatarTamanho(arquivo.size)}</span>
              </>
            ) : erro ? (
              <>
                <AlertCircle className="w-7 h-7 text-destructive" />
                <span className="text-sm text-destructive text-center leading-snug">{erro}</span>
              </>
            ) : (
              <>
                <FileText className="w-7 h-7 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center leading-snug">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o PDF ou clique para selecionar'}
                </span>
                <span className="text-xs text-muted-foreground">PDF · Até 30 MB</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Avisos após o card */}
      {arquivoGrande && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-700">
          <AlertTriangle className="text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">
            Arquivo grande ({formatarTamanho(arquivo.size)}). Documentos muito extensos podem levar
            mais tempo para serem analisados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
