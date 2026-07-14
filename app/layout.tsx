import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'LicitPro Analyzer — Analisador de Inabilitação',
  description:
    'Carregue o edital e a proposta do concorrente. O sistema identifica não conformidades e gera o recurso administrativo pronto para protocolo.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", notoSans.variable, geistSans.variable, "font-sans", notoSans.variable)}
    >
      <body className="min-h-full flex flex-col">
        <div className="min-h-full grow flex flex-col">
          {children}
        </div>
        <footer className="shrink-0 bg-slate-50 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} LicitPro Analyzer — Analisador de Inabilitação
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
