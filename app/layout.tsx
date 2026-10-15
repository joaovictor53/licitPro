import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

// Fonte do Proposta Certa, embutida (funciona sem internet).
const figtree = localFont({
  src: "./fonts/Figtree-Variable.woff2",
  variable: "--font-texto",
  weight: "400 700",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'LicitPro — do edital ao contrato',
  description:
    'Encontre editais, analise exigências, monte a proposta, acompanhe a sessão e a habilitação, e confira a proposta do concorrente — tudo em um só lugar.',
}

// Aplica o tema salvo antes da pintura, para a página não piscar no tema errado.
const SCRIPT_TEMA = `try{if(localStorage.getItem('tema')==='escuro')document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", figtree.variable, geistMono.variable, "font-sans")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="min-h-full grow flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
