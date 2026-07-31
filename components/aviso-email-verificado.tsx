"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * O link de confirmação enviado por e-mail redireciona para
 * /dashboard?verificado=1 — este aviso confirma o sucesso ao usuário.
 */
function Aviso() {
  const searchParams = useSearchParams();

  if (!searchParams.has("verificado")) return null;

  return (
    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
      <MailCheck className="text-emerald-600" />
      <AlertDescription className="text-emerald-800">
        E-mail confirmado. Sua análise gratuita está liberada.
      </AlertDescription>
    </Alert>
  );
}

export const AvisoEmailVerificado = () => (
  <Suspense fallback={null}>
    <Aviso />
  </Suspense>
);
