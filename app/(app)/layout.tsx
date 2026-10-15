// app/(app)/layout.tsx
// Layout das páginas autenticadas: barra lateral compartilhada. O grupo (app) não aparece na URL.

import { AppShell } from '@/components/app-shell'

export default function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
