# Analisador de Inabilitação — Guia de Implementação em Next.js

> App que lê o edital e a proposta do concorrente em PDF, identifica não conformidades e gera o recurso administrativo pronto para protocolo.

---

## Por que Next.js?

No protótipo em HTML, a chave da API Anthropic ficava exposta no navegador — qualquer pessoa inspecionando o código conseguia vê-la. No Next.js, a chamada para a API fica dentro de uma **Route Handler** no servidor: o navegador nunca vê a chave.

---

## Pré-requisitos

- Node.js 18 ou superior
- Conta em alguma sdk de ia (Gemini, OpenAI, Anthropic)

---

## Passo 1 — Criar o projeto

```bash
npx create-next-app@latest analisador-licitacao
```

Nas perguntas do assistente, responda:

```
✔ Would you like to use TypeScript? → Yes
✔ Would you like to use ESLint? → Yes
✔ Would you like to use Tailwind CSS? → Yes
✔ Would you like to use `src/` directory? → No
✔ Would you like to use App Router? → Yes
✔ Would you like to customize the default import alias? → No
```

Entre na pasta do projeto:

```bash
cd analisador-licitacao
```

---

## Passo 2 — Instalar dependências

```bash

npm install react-dropzone
npm install lucide-react
```

| Pacote | Para que serve |
|---|---|
| `@anthropic-ai/sdk` | SDK oficial da Anthropic para chamar o Claude |
| `react-dropzone` | Área de upload de arquivos com drag-and-drop |
| `lucide-react` | Ícones para a interface |

---

## Passo 3 — Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Importante:** nunca coloque a chave direto no código. O `.env.local` não é enviado ao Git.

Adicione ao `.gitignore` (já vem por padrão no Next.js, mas confirme):

```
.env.local
.env*.local
```

---

## Passo 4 — Estrutura de pastas

Após a criação, organize assim:

```
analisador-licitacao/
├── app/
│   ├── api/
│   │   └── analisar/
│   │       └── route.ts          ← chamada para a sdk(servidor)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  ← página principal
├── components/
│   ├── UploadCard.tsx            ← componente de upload de PDF
│   ├── ResultadoCard.tsx         ← exibe cada não conformidade
│   ├── TextoCopiavel.tsx         ← caixa com botão de copiar
│   └── LoadingState.tsx          ← animação de carregamento
├── types/
│   └── analise.ts                ← tipagens TypeScript
├── .env.local
└── package.json
```

---

## Passo 5 — Definir os tipos TypeScript

Crie o arquivo `types/analise.ts`:

```typescript
// types/analise.ts

export interface NaoConformidade {
  id: number
  titulo: string
  item_edital: string
  problema: string
  gravidade: 'material' | 'sanável'
  fundamento_legal: string
}

export interface ResultadoAnalise {
  resumo: string
  total_irregularidades: number
  nao_conformidades: NaoConformidade[]
  recurso_administrativo: string
  mensagem_pregoeiro: string
}

export interface ErroAnalise {
  erro: string
  detalhes?: string
}
```

---

## Passo 6 — Criar a Route Handler (API do servidor)

Crie o arquivo `app/api/analisar/route.ts`:

```typescript
// app/api/analisar/route.ts

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { ResultadoAnalise } from '@/types/analise'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021 (Nova Lei de Licitações), da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá dois documentos PDF:
- DOCUMENTO 1: O EDITAL da licitação
- DOCUMENTO 2: A PROPOSTA e/ou documentação de habilitação do CONCORRENTE que venceu a fase de lances

Sua missão exclusiva é identificar NÃO CONFORMIDADES na documentação do concorrente em relação ao exigido pelo edital. Foque em:
- Documentos ausentes que o edital exige
- Certidões ou documentos com validade vencida
- Atestados técnicos que não cobrem o objeto contratado
- Documentos que não atendem às especificações do edital
- Irregularidades cadastrais (SICAF, CEIS, CNEP)
- Exigências técnicas não comprovadas

Para cada não conformidade, classifique como:
- "material": vício insanável que fundamenta inabilitação
- "sanável": vício que pode ser corrigido por diligência

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown. Use este formato exato:

{
  "resumo": "resumo em 2-3 frases",
  "total_irregularidades": number,
  "nao_conformidades": [
    {
      "id": number,
      "titulo": "nome curto da irregularidade",
      "item_edital": "item/cláusula do edital descumprido",
      "problema": "descrição objetiva do que está errado ou ausente",
      "gravidade": "material" ou "sanável",
      "fundamento_legal": "base legal aplicável"
    }
  ],
  "recurso_administrativo": "texto completo e formal do recurso, com cabeçalho, fundamentos fáticos e jurídicos, pedido expresso de inabilitação e encerramento formal",
  "mensagem_pregoeiro": "mensagem direta ao pregoeiro declarando intenção de recorrer e apontando os pontos irregulares"
}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { editalBase64, concorrenteBase64 } = body

    if (!editalBase64 || !concorrenteBase64) {
      return NextResponse.json(
        { erro: 'É necessário enviar os dois documentos PDF.' },
        { status: 400 }
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: editalBase64,
              },
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: concorrenteBase64,
              },
            },
            {
              type: 'text',
              text: 'O PRIMEIRO documento é o EDITAL. O SEGUNDO é a proposta/documentação do CONCORRENTE vencedor dos lances. Analise e retorne apenas o JSON.',
            },
          ],
        },
      ],
    })

    const rawText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const resultado: ResultadoAnalise = JSON.parse(cleaned)

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro na análise:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { erro: 'A resposta da IA não pôde ser interpretada. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { erro: 'Erro interno ao processar os documentos.' },
      { status: 500 }
    )
  }
}
```

---

## Passo 7 — Componente de Upload

Crie `components/UploadCard.tsx`:

```tsx
// components/UploadCard.tsx
'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  label: string
  etapa: string
  arquivo: File | null
  onArquivo: (file: File) => void
  erro?: string
}

export function UploadCard({ label, etapa, arquivo, onArquivo, erro }: Props) {
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
    maxSize: 30 * 1024 * 1024, // 30MB
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        {etapa} — {label}
      </p>

      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center gap-2 p-6 border rounded-lg cursor-pointer
          transition-colors duration-150
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300'}
          ${arquivo ? 'border-green-400 bg-green-50' : ''}
          ${erro ? 'border-red-400 bg-red-50' : ''}
        `}
      >
        <input {...getInputProps()} aria-label={`Carregar ${label}`} />

        {arquivo ? (
          <>
            <CheckCircle className="w-7 h-7 text-green-500" />
            <span className="text-sm text-green-700 text-center break-all">
              {arquivo.name}
            </span>
          </>
        ) : erro ? (
          <>
            <AlertCircle className="w-7 h-7 text-red-500" />
            <span className="text-sm text-red-600 text-center">{erro}</span>
          </>
        ) : (
          <>
            <FileText className="w-7 h-7 text-gray-400" />
            <span className="text-sm text-gray-500 text-center">
              {isDragActive
                ? 'Solte o arquivo aqui'
                : 'Arraste o PDF ou clique para selecionar'}
            </span>
            <span className="text-xs text-gray-400">Até 30MB</span>
          </>
        )}
      </div>
    </div>
  )
}
```

---

## Passo 8 — Componente de Resultado

Crie `components/ResultadoCard.tsx`:

```tsx
// components/ResultadoCard.tsx

import { NaoConformidade } from '@/types/analise'
import { Bookmark, Scale } from 'lucide-react'

interface Props {
  item: NaoConformidade
}

export function ResultadoCard({ item }: Props) {
  const isMaterial = item.gravidade === 'material'

  return (
    <div
      className={`
        border rounded-xl p-4 mb-3
        ${isMaterial
          ? 'border-red-300 border-l-4 border-l-red-500 bg-white'
          : 'border-amber-300 border-l-4 border-l-amber-500 bg-white'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-medium text-sm text-gray-800">{item.titulo}</span>
        <span
          className={`
            text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0
            ${isMaterial
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
            }
          `}
        >
          {isMaterial ? 'Material — insanável' : 'Sanável'}
        </span>
      </div>

      {item.item_edital && (
        <p className="flex items-center gap-1 text-xs text-gray-400 mb-2">
          <Bookmark className="w-3 h-3" />
          {item.item_edital}
        </p>
      )}

      <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.problema}</p>

      {item.fundamento_legal && (
        <p className="flex items-center gap-1 text-xs text-gray-400">
          <Scale className="w-3 h-3" />
          {item.fundamento_legal}
        </p>
      )}
    </div>
  )
}
```

---

## Passo 9 — Componente de Texto Copiável

Crie `components/TextoCopiavel.tsx`:

```tsx
// components/TextoCopiavel.tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  titulo: string
  texto: string
  icone: React.ReactNode
}

export function TextoCopiavel({ titulo, texto, icone }: Props) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icone}
          {titulo}
        </div>
        <button
          onClick={copiar}
          className="flex items-center gap-1 text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label={`Copiar ${titulo}`}
        >
          {copiado ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-600">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copiar
            </>
          )}
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 max-h-72 overflow-y-auto">
        <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
          {texto}
        </pre>
      </div>
    </div>
  )
}
```

---

## Passo 10 — Página principal

Substitua o conteúdo de `app/page.tsx`:

```tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import { Scan, AlertTriangle, CheckCircle, FileSearch, MessageSquare, RefreshCw } from 'lucide-react'
import { UploadCard } from '@/components/UploadCard'
import { ResultadoCard } from '@/components/ResultadoCard'
import { TextoCopiavel } from '@/components/TextoCopiavel'
import { ResultadoAnalise } from '@/types/analise'

type Estado = 'inicial' | 'carregando' | 'resultado' | 'erro'

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const resultado = reader.result as string
      resolve(resultado.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.readAsDataURL(arquivo)
  })
}

const mensagensCarregamento = [
  'Lendo o edital...',
  'Extraindo requisitos de habilitação...',
  'Analisando documentos do concorrente...',
  'Cruzando exigências com evidências...',
  'Identificando não conformidades...',
  'Gerando recurso administrativo...',
]

export default function Home() {
  const [edital, setEdital] = useState<File | null>(null)
  const [concorrente, setConcorrente] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('inicial')
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null)
  const [erro, setErro] = useState<string>('')
  const [msgCarregamento, setMsgCarregamento] = useState(mensagensCarregamento[0])

  const podeAnalisar = edital !== null && concorrente !== null

  const analisar = async () => {
    if (!edital || !concorrente) return

    setEstado('carregando')
    setErro('')

    let idx = 0
    const intervalo = setInterval(() => {
      idx = (idx + 1) % mensagensCarregamento.length
      setMsgCarregamento(mensagensCarregamento[idx])
    }, 4000)

    try {
      const [editalBase64, concorrenteBase64] = await Promise.all([
        arquivoParaBase64(edital),
        arquivoParaBase64(concorrente),
      ])

      const resposta = await fetch('/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editalBase64, concorrenteBase64 }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao processar os documentos.')
      }

      setResultado(dados)
      setEstado('resultado')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido.')
      setEstado('erro')
    } finally {
      clearInterval(intervalo)
    }
  }

  const reiniciar = () => {
    setEdital(null)
    setConcorrente(null)
    setEstado('inicial')
    setResultado(null)
    setErro('')
    setMsgCarregamento(mensagensCarregamento[0])
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Scan className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-lg font-medium text-gray-900">
            Analisador de inabilitação
          </h1>
        </div>
        <p className="text-sm text-gray-500 mb-6 pl-12">
          Carregue o edital e a proposta do concorrente — o sistema encontra as brechas e gera o recurso pronto.
        </p>

        <hr className="border-gray-200 mb-6" />

        {/* Upload */}
        {estado !== 'resultado' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <UploadCard
                etapa="Passo 1"
                label="Edital"
                arquivo={edital}
                onArquivo={setEdital}
              />
              <UploadCard
                etapa="Passo 2"
                label="Proposta do concorrente"
                arquivo={concorrente}
                onArquivo={setConcorrente}
              />
            </div>

            <button
              onClick={analisar}
              disabled={!podeAnalisar || estado === 'carregando'}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-sm
                flex items-center justify-center gap-2 mb-6
                transition-all duration-150
                ${podeAnalisar && estado !== 'carregando'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Scan className="w-4 h-4" />
              Iniciar varredura
            </button>
          </>
        )}

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mb-6">
            <div className="w-12 h-12 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-800 mb-1">{msgCarregamento}</p>
            <p className="text-sm text-gray-400">
              Isso pode levar até 60 segundos dependendo do tamanho dos documentos
            </p>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 text-sm">Erro na análise</p>
              <p className="text-red-600 text-sm mt-1">{erro}</p>
            </div>
          </div>
        )}

        {/* Resultado */}
        {estado === 'resultado' && resultado && (
          <>
            {/* Resumo */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-3">
              <FileSearch className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Resumo da análise
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{resultado.resumo}</p>
              </div>
            </div>

            {/* Não conformidades */}
            {resultado.nao_conformidades.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700">
                  Nenhuma irregularidade encontrada na proposta do concorrente.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {resultado.total_irregularidades} irregularidade
                    {resultado.total_irregularidades !== 1 ? 's' : ''} encontrada
                    {resultado.total_irregularidades !== 1 ? 's' : ''}
                    {' — '}
                    <span className="text-red-600">
                      {resultado.nao_conformidades.filter(i => i.gravidade === 'material').length} material
                      {resultado.nao_conformidades.filter(i => i.gravidade === 'material').length !== 1 ? 'is' : ''}
                    </span>
                  </span>
                </div>
                {resultado.nao_conformidades.map((item) => (
                  <ResultadoCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Textos gerados */}
            <div className="space-y-4 mb-6">
              <TextoCopiavel
                titulo="Recurso administrativo"
                texto={resultado.recurso_administrativo}
                icone={<FileSearch className="w-4 h-4" />}
              />
              <TextoCopiavel
                titulo="Mensagem ao pregoeiro"
                texto={resultado.mensagem_pregoeiro}
                icone={<MessageSquare className="w-4 h-4" />}
              />
            </div>

            {/* Botão nova análise */}
            <button
              onClick={reiniciar}
              className="w-full py-2.5 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Nova análise
            </button>
          </>
        )}

      </div>
    </main>
  )
}
```

---

## Passo 11 — Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador.

---

## Passo 12 — Publicar (deploy)

A forma mais simples é usar a [Vercel](https://vercel.com), criada pelos mesmos desenvolvedores do Next.js.

```bash
npm install -g vercel
vercel
```

Durante o processo, a Vercel vai pedir para conectar ao repositório Git e configurar as variáveis de ambiente. Adicione `ANTHROPIC_API_KEY` no painel da Vercel em:

**Settings → Environment Variables**

Após o deploy, o app estará acessível em uma URL pública (`https://seu-projeto.vercel.app`).

---

## Resumo do fluxo completo

```
Usuário sobe os PDFs
        ↓
Navegador converte para base64
        ↓
POST /api/analisar  ← só roda no servidor (chave protegida)
        ↓
Anthropic API (Claude Sonnet 4.6)
        ↓
JSON com não conformidades + recurso + mensagem
        ↓
Interface exibe resultado e botões de copiar
```

---

## Limitações conhecidas

| Situação | O que acontece |
|---|---|
| PDF escaneado com baixa resolução | Claude ainda tenta ler via visão, mas pode perder detalhes em imagens muito borradas |
| Arquivo maior que 30MB | Upload bloqueado no componente — comprimir o PDF antes |
| Edital com muitos anexos | Envie apenas o corpo do edital; os anexos irrelevantes aumentam o custo e o tempo de análise |
| Resposta JSON malformada | A rota retorna erro 500 com mensagem clara; raramente ocorre |

---

## Próximas funcionalidades sugeridas

- **Histórico de análises** — salvar resultados no banco (ex: Supabase ou PlanetScale)
- **Autenticação** — login por empresa com NextAuth.js
- **Exportar recurso em PDF** — usando a biblioteca `jsPDF` ou `Puppeteer`
- **Múltiplos concorrentes** — analisar as propostas de todos os participantes em sequência
- **Alerta de prazo** — notificar o usuário que o prazo para recurso é de 3 dias úteis após a sessão
