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
  title: 'LicitPro — Analisador de Inabilitação',
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
