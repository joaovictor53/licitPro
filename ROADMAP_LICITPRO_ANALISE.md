# Roadmap de Implementação — LicitPro Análise (17 ferramentas)

Baseado em `LicitPro_Analise_Ferramentas.md`. Este documento não altera as regras de negócio ali definidas — só organiza a ordem de construção e mapeia contra o que já existe no repositório.

## 0. Onde estamos hoje

O que existe em produção (`app/api/analisar`, `lib/processar-pdf-servidor.ts`, `app/src/db/schema.ts`) cobre, na prática, só a **Ferramenta 16 (Verificação de Autenticidade)** aplicada ao concorrente — o doc chama isso de "a parte final". Reaproveitável diretamente:

```
Extração de PDF com OCR (Tesseract)      → base da Ferramenta 3 (Leitura do Edital)
Marcação de página [[PÁGINA N]]           → citação de trecho/cláusula, exigida em várias ferramentas
Pipeline map-reduce por blocos            → necessário para editais e dossiês grandes
Camada anti-alucinação (confiança)        → mesmo princípio da Regra Geral 5 e 6
groq-sdk + prompts estruturados           → reaproveitável para extração de exigências
Schema: user (com razaoSocial/cnpj/end.)  → embrião do cadastro de empresa
```

Não existe: schema de empresa completo, entidade `participação` com máquina de estados (22 estados), dossiê documental, integrações externas (PNCP, portais de transparência, plataformas de compra), cálculo financeiro, geração de documentos/anexos, fluxo de assinatura.

**Conclusão:** a Ferramenta 16 não precisa ser refeita — ela precisa ser **encaixada** dentro do fluxo novo (ligada à F13/F14) quando chegarmos lá.

## 1. Dependências entre ferramentas

Ordem imposta pelo próprio fluxo do documento, mais o que cada uma consome de dado das outras:

```
Cadastro de empresa (base) ─────────────────────────────────────────┐
                                                                      │
F1 Radar de Editais ──► F3 Leitura do Edital ──► F6 Prep. Documental │
        │                        │                        │         │
        └──► F2 Ficha do Recurso │                         │         │
                    │            ▼                         │         │
                    └──────► F4 Viabilidade ◄───────────────┘         │
                                  │                                   │
                                  ▼                                   │
                          F5 Decisão de Participar                    │
                                  │                                   │
                                  ▼                                   │
                    F7 Composição de Preço ──► F8 Montagem da Proposta│
                                                        │              │
                                                        ▼              │
                                      F9 Aprovação e Assinatura        │
                                                        │              │
                                                        ▼              │
                                      F11 Preparação p/ Upload         │
                                                        │              │
                                                        ▼              │
                                              F10 Envio                │
                                                        │              │
                                                        ▼              │
                                        F12 Registro da Sessão         │
                                            │           │              │
                                            ▼           ▼              │
                                   F13 Habilitação   F14 Recurso       │
                                            │           │              │
                                            ▼           ▼              │
                                      F15 Resultado e Contrato ◄────── F16 Autenticidade
                                                        │
                                                        ▼
                                        F17 Registro Histórico (consome tudo)
```

`F16` entra em dois pontos (conferência da própria empresa em F6, e do concorrente depois de F12/F13/F14) e já tem base de código pronta. `F17` só faz sentido depois de haver dado real fluindo pelas outras.

## 2. Fases propostas

Cada fase entrega algo utilizável sozinho — não é "tudo ou nada".

### Fase 0 — Fundação de dados (bloqueante para tudo)
- Novo schema: `empresa` (identificação, financeiro, operacional, documental, elegibilidade — ver seção "Cadastro da empresa" do doc, Anexos).
- Entidade `participacao` com os 22 estados fechados (Anexos) e transições básicas.
- Isolamento por organização/empresa (Regra Geral 8) desde o desenho inicial das tabelas — mais barato resolver agora do que depois.
- Tabela de auditoria genérica (Regra Geral 9): quem, quando, o quê, em qual participação.
- **Sem isso, nenhuma ferramenta de 1 a 15 tem onde gravar dado.**

### Fase 1 — Radar de Editais (F1)
- Integração com API pública do PNCP (tarefa de verificação prévia: confirmar endpoints/paginação/limites atuais — está listada nos Anexos do próprio doc).
- Filtros por CNAE/esfera/estado/município/órgão; busca livre.
- Tabela `cnae_por_objeto` (mantida pela Arumã, não por cliente).
- Download do edital só ao clicar "Analisar a fundo" (regra explícita — não baixar em triagem).
- Acompanhamento de alteração (hash + diff por campo) pode ficar para uma sub-fase 1b, não é bloqueante para o MVP do radar.

### Fase 2 — Leitura do Edital (F3)
- Maior reaproveitamento de código existente (extração + OCR já prontos).
- Monta a matriz de conformidade (exigência × página × cláusula × critério × risco).
- Ponto crítico do doc: **a IA extrai a exigência, não conclui se a empresa atende** — e itens críticos nunca fecham sem conferência humana. Isso é um requisito de UX (fila de conferência), não só de prompt.

### Fase 3 — Ficha do Recurso (F2)
- Semáforo (verde/amarelo/vermelho) com fatores explícitos.
- Roteiro de consulta a portais de transparência (tarefa de verificação prévia: confirmar quais estão no ar, listada nos Anexos).
- Indicador de pagamento do órgão só fica "vivo" depois que F15 (pagamentos) começar a alimentar histórico — no início, fica com base amostral zerada e isso deve aparecer na tela, não ser escondido.

### Fase 4 — Preparação Documental (F6)
- Depende do schema de dossiê documental (ainda não existe) e da matriz da F3.
- Checklist por participação, revalidação contra todos os marcos (não só a sessão).
- Regra de balanço patrimonial (registro na Junta Comercial) precisa de campos próprios no dossiê.

### Fase 5 — Viabilidade Financeira e Retorno (F4)
- O módulo mais complexo do meio do fluxo: composição de custo, piso/alvo/teto, cenários base/conservador, análise de retorno.
- Cálculo de tributos é sempre **informado pelo contador**, nunca calculado pela IA/sistema (regra explícita) — não subestimar isso na modelagem: é campo de entrada com data e aviso de revisão após 6 meses, não uma fórmula.

### Fase 6 — Decisão de Participar (F5)
- Tela agregadora, sem novo cálculo — só junta o que as fases 1–5 já produziram. Rápida de construir uma vez que as anteriores existirem.

### Fase 7 — Composição de Preço (F7) + Montagem da Proposta (F8)
- Geração de planilha no formato do edital (detecção de modelo anexo).
- Geração de documento com timbre da empresa e anexos-modelo preenchidos.
- Aqui a checagem final **bloqueia de verdade** (diferente das fases anteriores, que só alertam) — importante deixar isso explícito na implementação dos estados.

### Fase 8 — Aprovação e Assinatura (F9) + Preparação de Upload (F11)
- Fluxo de aprovação comercial separado de assinatura formal.
- Assinatura: o sistema **nunca assina em nome de ninguém** — o que se constrói aqui é orientação (gov.br vs ICP-Brasil conforme exigência do edital) e registro do arquivo assinado, não uma integração de assinatura real (a API do gov.br é confirmada no próprio doc como indisponível para empresa privada).
- F11 depende de uma tabela de plataformas de compra (limites, formato, nomenclatura) — tarefa de verificação prévia listada nos Anexos.

### Fase 9 — Envio (F10) + Registro da Sessão (F12)
- F10 é só conferência final + registro de protocolo (sistema nunca envia sozinho).
- F12 é só registro pós-fato (sistema nunca acessa portal ao vivo) — tecnicamente simples, importante não construir nada que pareça acompanhamento automatizado de sessão (proibido pela Regra Geral 1).

### Fase 10 — Habilitação (F13) + Recurso (F14)
- F13 reaproveita o dossiê da F6, mas revalida tudo **na data de hoje**, não na data da sessão — é uma revalidação, não uma cópia de status.
- F14 tem o prazo mais crítico do sistema inteiro (intenção de recorrer, geralmente na própria sessão) — a engine de alertas precisa estar madura antes desta fase (dias úteis + calendário de feriado municipal, Regra Geral 14).
- Aqui é o ponto natural para religar a **Ferramenta 16 já existente** (autenticidade do concorrente) como uma ação dentro do fluxo de recurso, em vez de ferramenta avulsa.

### Fase 11 — Resultado e Contrato (F15)
- Fecha o ciclo com F2 (empenho real vs. previsão) e alimenta F17.
- Pagamentos registrados aqui são o dado que dá vida ao "indicador de pagamento do órgão" da Fase 3 — sem isso rodando por um tempo, esse indicador nunca sai do zero.

### Fase 12 — Registro Histórico (F17)
- Só os 7 indicadores listados no doc, calculados sobre dado real das fases anteriores. Não adiantar esta fase — sem histórico real acumulado (algumas semanas/meses de uso), os indicadores saem vazios ou enganosos.

## 3. Coisas transversais que não pertencem a uma fase só

- **Regra de origem do dado** (extraído / informado / calculado / inferido): decidir agora um padrão de UI (badge, cor, ícone) para não reinventar em cada ferramenta.
- **Auditoria** (Regra Geral 9): uma tabela, um middleware, usado por todas as fases a partir da Fase 0.
- **Isolamento multiempresa** (Regra Geral 8): mesma lógica.
- **Tarefas de verificação externa** listadas nos Anexos do doc (API do PNCP, portais de transparência, limites de plataforma, API gov.br) — cada uma é pré-requisito de uma fase específica (1, 3, 8/11, 8), não um bloco único a fazer antes de tudo.

## 4. Recomendação de sequência mínima viável

Se o objetivo é ter algo demonstrável o quanto antes sem violar dependências:

```
Fase 0 (fundação) → Fase 1 (Radar) → Fase 2 (Leitura do Edital)
```

Essas três já formam um produto coerente e demonstrável (encontrar edital → ler e saber se dá pra participar), e reaproveitam a maior parte do código já existente do Analyzer.

## 5. Reaproveitamento do Proposta Certa (repo privado `proposta-certa-ai/proposta-certa`, branch `master`)

> **Correção da seção 0:** os commits recentes mostram que o LicitPro já tem as ferramentas 1 a 15 implementadas em `lib/` (radar, leitura do edital, checklist documental, composição de preço, montagem da proposta, assinatura, upload, envio, sessão, habilitação, recurso e resultado). A seção 0 descreve o estado antigo, de quando só existia a F16. O que segue compara o Proposta Certa com o que já existe em TypeScript, não com o que falta criar do zero.

**O que é o Proposta Certa.** Motor em Python/Streamlit, local, com dados em JSON por empresa (sem banco). Tem cerca de 36 mil linhas em `app/` e cerca de 2.500 testes. Lê o edital, confere a documentação da empresa, gera declarações e proposta e monta o dossiê. A regra central é que edital novo entra como dado, nunca como mudança de código.

**Como reaproveitar.** O Proposta Certa é Python local e o LicitPro é Next.js com Drizzle. A recomendação é **portar a regra para TypeScript** (as regras são pequenas e determinísticas) e usar os testes do Proposta Certa como casos de teste de referência. Rodar o motor Python como serviço só faria sentido para a geração de PDF, e nem aí é necessário: o LicitPro já usa `pdf-lib`.

Os módulos do Proposta Certa abaixo foram lidos pelo cabeçalho e pela lista de funções, não linha a linha. Antes de portar cada um, ler o código completo e os testes correspondentes.

### F6 — Preparação Documental (hoje: `lib/checklist-documental.ts`, 84 linhas)

| Proposta Certa | O que traz | Lacuna no LicitPro |
|---|---|---|
| `matriz_conformidade.py` (1.580 linhas) | Status `encontrado/vencido/ausente/revisar/nao_aplicavel`. Casamento por palavras-chave curadas, com similaridade de texto só como fallback fraco. Item `revisar` nunca é dado como atendido sozinho. | Hoje só há `sugerirDocumentoParaExigencia` por palavra-chave e 4 situações. Faltam `nao_aplicavel` e o tratamento por natureza jurídica e por porte ME/EPP. |
| `catalogo_personalizado.py` | Tipo de documento que o edital pede e não existe no catálogo vira entrada nova, marcada "(novo tipo — confirmar)", com origem (item e página). A confirmação fica guardada e vale para os próximos editais. | Não existe. Cabe como tabela `tipo_documento` por organização, com `origem_edital` e `confirmado`. |
| `tipos_certidao.py` (81 linhas) | Classifica certidão em negativa, positiva com efeitos de negativa e positiva, só pelo título do documento. Sem título reconhecível, devolve nada (não inventa). | Portar quase direto. Útil para validar o status das certidões do dossiê. |
| `config_locais_emissao.py`, `config/dominios_oficiais.yaml` | Onde emitir cada certidão por jurisdição e domínios oficiais, como configuração extensível. | Não existe. Vale como tabela de configuração, não como código. |
| `me_epp.py` | Regularização de ME/EPP: porte confirmado, art. 4º da Lei 14.133 (limite de receita bruta), regras e citações vindas da tabela `config/regras_analise.yaml`. Cálculo em Decimal, com feriados nacionais. | A rota `regularizacao-me-epp` já existe no LicitPro. Comparar as regras antes de portar: o Proposta Certa só libera o benefício com tudo confirmado e registrado. |

### F7 — Composição de Preço (hoje: `lib/composicao-preco.ts`, 97 linhas)

| Proposta Certa | O que traz | Lacuna no LicitPro |
|---|---|---|
| `regra_casas_decimais.py` | Casas decimais lidas do edital (com item e página). Modos: padrão (2 casas, excesso recusado), máximo e truncar. | O LicitPro arredonda sempre para 2 casas. Edital que manda truncar, ou que pede 3 ou 4 casas, hoje sai errado. |
| `valores_proposta.py` | Dinheiro em `Decimal` (ROUND_HALF_UP só no total de cada item). O preço mínimo para lances fica em arquivo separado e nenhum gerador de documento o lê. | `composicao-preco.ts` usa `Math.round(valor*100)/100` em `number` (ponto flutuante). Trocar por inteiro em centavos ou por uma biblioteca decimal. O isolamento do preço mínimo de lance merece virar regra de arquitetura. |
| `readequacao_proposta.py` | Proposta readequada depois dos lances: ajuste proporcional ou item a item, refazendo as contas em Decimal. Respeita "vedado aumentar preço unitário" e "total igual ao lance". Usa busca do menor caminho em centavos para fechar o resíduo. | Não existe. É lacuna real do ciclo pós-lance, entre F12 e F13. |

### F8 — Montagem da Proposta (hoje: `lib/montagem-proposta.ts`, `lib/documento-proposta.ts`, `lib/planilha-precos.ts`)

O próprio código do LicitPro declara como fora de escopo: reprodução do modelo de proposta do edital, anexos-modelo preenchidos e conferência de validade e prazo de entrega contra o edital. É aqui que o Proposta Certa mais ajuda.

| Proposta Certa | O que traz | Lacuna no LicitPro |
|---|---|---|
| `exigencias_proposta.py` (965 linhas) | Lê do edital, com página, item e trecho literal: modelo de proposta, campos obrigatórios, itens do TR, critério e unidade de julgamento. Cada exigência só vale se o trecho citado existe no edital. Uma conferência independente da IA acrescenta campos que ela costuma esquecer (validade, prazo de entrega, garantia, marca/modelo, dados bancários). | Cobre exatamente as duas conferências que `montagem-proposta.ts` deixa de fora. O esquema Pydantic (`ExigenciasProposta`) é um bom ponto de partida para o tipo TypeScript. |
| `gerador_proposta.py` (547 linhas) | Com modelo no edital, reproduz estrutura, ordem e textos fixos. Sem modelo, usa padrão com todos os campos obrigatórios. Aplica timbre em todas as páginas. Colunas da tabela nunca quebram palavra ao meio. | Hoje `documento-proposta.ts` gera só um resumo em texto. Portar a ideia de modelo do edital + modelo padrão. |
| `valor_por_extenso.py` (72 linhas) | Valor em reais por extenso, em `Decimal`, até 10^15. | Portar direto (função pura). Vários modelos de proposta pedem "valor por extenso". Atenção: está na branch `etapa5-wip`, ainda não verificada. |
| `porteiro_proposta.py` | Confere o PDF final: nenhum marcador `{{...}}` sem resolver e nenhum "None" no texto. | Útil como checagem bloqueante final da F8. |

### F13 — Habilitação (hoje: `app/participacoes/[id]/habilitacao`, `lib/classificacao-assinatura.ts`)

| Proposta Certa | O que traz | Lacuna no LicitPro |
|---|---|---|
| `gerador_declaracoes.py`, `declaracao_do_edital.py` | Declaração gerada em ordem de preferência: modelo do edital (texto fiel, campos preenchidos), depois texto padrão por tipo, depois trecho literal do edital. Sempre marcada "gerada a partir do edital — confira antes de assinar". Templates em `data/templates/*.txt` com marcadores `{{CAMPO}}`. | O LicitPro não gera declarações. Os 6 templates (fato impeditivo, ME/EPP, menor aprendiz, procuração, declarações diversas, proposta reformulada) podem ser reaproveitados como texto, depois de revisão jurídica. |
| `poderes_signatario.py` | Decide se o primeiro representante legal pode assinar (sócio/administrador), se precisa de procuração (e a gera) ou se está bloqueado por falta de dado. Nunca decide por suposição. | Casa com a Regra Geral de que o sistema nunca assina em nome de ninguém. Pode alimentar a F9. |
| `montador_final.py` | Bloqueia a montagem se houver item ausente ou vencido. Item `revisar` nunca entra sozinho. Timbre só nos documentos gerados, nunca nos fixos. Gera manifesto com SHA-256 e checklist com o alerta de inversão de fases. | O manifesto com hash e a regra "timbre só no gerado" valem para a F11 (upload). |
| `motor_analise/` | Assinatura digital (pyhanko), QR, balanço, consulta oficial, proposta do concorrente. | É o equivalente avançado da F16, que o LicitPro já tem. Comparar antes de decidir qual manter. |

### Ordem sugerida

1. **Dinheiro em centavos e casas decimais do edital (F7).** É a menor mudança e evita erro de valor em proposta.
2. **`valor_por_extenso` e `porteiro_proposta` (F8).** Funções puras, portáveis em um dia.
3. **Exigências da proposta com página e trecho (F8/F3).** Fecha as duas conferências que hoje estão fora de escopo.
4. **Declarações e procuração (F13/F9).** Maior ganho para o usuário, mas exige revisão jurídica dos textos.
5. **Readequação pós-lance (entre F12 e F13).** Lacuna real do ciclo, de maior esforço.
6. **Catálogo extensível e `tipos_certidao` (F6).**

### Cuidados antes de portar

- **Estado do repo de origem.** O `master` está estável (etapas 1 a 4 fechadas), mas `valor_por_extenso`, a recusa de condição pior que o mínimo e partes de `gerador_proposta` estão só na branch `etapa5-wip`, sem revisão nem suíte completa.
- **Dados reais.** O repo guarda dados de empresa real em `data/empresas/` (ignorados pelo git, mas presentes na máquina de quem usa). Ao portar, levar só código e fixtures fictícias (`empresa_exemplo`).
- **Premissa de produto.** Por regra do Proposta Certa, nenhum número de edital, órgão ou item pode aparecer no código. Manter isso no port.
- **Licença:** o repo é do mesmo dono do LicitPro, então não há restrição para copiar código.

### Status do port (14/10/2026)

Os seis passos da "Ordem sugerida" foram portados para TypeScript, com testes (`npm test`, 79 testes), `tsc` e `next build` limpos:

1. Dinheiro exato e casas decimais do edital (F7): `lib/dinheiro.ts`, `lib/casas-decimais.ts`.
2. Valor por extenso e porteiro do PDF (F8): `lib/valor-por-extenso.ts`, `lib/porteiro-proposta.ts`.
3. Condições da proposta lidas do edital (F8/F3): `lib/exigencias-proposta.ts`, rota `condicoes-proposta`, migração `drizzle/0020_condicoes_proposta.sql` (**ainda não aplicada: rodar `npm run db:migrate`**).
4. Declarações e procuração (F13/F9): `lib/declaracoes.ts`, `lib/poderes-signatario.ts`, rota `declaracoes`.
5. Readequação ao lance (entre F12 e F13): `lib/readequacao-proposta.ts`, rota `readequacao`.
6. Tipos de certidão e catálogo extensível (F6): `lib/tipos-certidao.ts`, `lib/catalogo-documentos.ts`.

Não portado: persistência do catálogo de tipos confirmados (precisa de tabela e de ampliar o enum `tipo_documento_dossie`), `me_epp`, `config_locais_emissao` e a leitura de itens do TR.

