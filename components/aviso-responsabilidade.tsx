// components/aviso-responsabilidade.tsx

import Link from 'next/link'
import { Info } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

/**
 * Aviso de responsabilidade exibido na tela de resultado, junto ao recurso
 * administrativo e à mensagem ao pregoeiro. Deixa explícito que a análise é um
 * apoio técnico e que a validação jurídica final é de quem usa a ferramenta no
 * pregão. (Melhoria 2.4)
 */
export const AvisoResponsabilidade = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <Info className="text-amber-600" />
      <AlertTitle className="text-amber-900">Aviso de responsabilidade</AlertTitle>
      <AlertDescription className="text-amber-800">
        <p>
          Esta análise é um <span className="font-semibold">apoio técnico</span> e aponta
          fundamentos para o recurso, mas não garante o seu êxito. A validação jurídica final
          — inclusive a decisão de protocolar o recurso e a mensagem ao pregoeiro — é de
          responsabilidade de quem utiliza a ferramenta no pregão (o próprio licitante, um
          técnico em licitações ou um advogado). Confira sempre as citações no documento antes
          de usar.
        </p>
        <p className="!mb-0">
          Ao utilizar a análise você concorda com os{' '}
          <Link href="/termos" className="font-medium">
            Termos de Uso
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  )
}
