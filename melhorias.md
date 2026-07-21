# LICITPRO ANALYZER
## Relatório de Pendências Técnicas — Pós-Lançamento

**Destinatário:** Responsável Técnico (Estrutural/Tecnologia)  
**Origem:** Kleytton Vieira Monteiro — Diretor Geral  
**Local e Data:** Manaus, Amazonas — Julho de 2026  

---

## 1. Contexto

O sistema já está em produção (`licitproanalyzer.com.br`), com autenticação, painel administrativo, histórico e planos ativos[cite: 1]. O fluxo funcional principal — upload de edital e proposta, varredura, geração de não conformidades, recurso administrativo e mensagem ao pregoeiro — está operacional[cite: 1]. Este relatório lista, em ordem de prioridade, os pontos que precisam ser corrigidos ou desenvolvidos antes de abrirmos o produto para clientes reais (Design Partners) e para a fase de venda paga[cite: 1].

---

## 2. Pontos a Resolver — Em Ordem de Prioridade

### 2.1. Evidência real com citação de página/trecho do documento
> **Prioridade:** `CRÍTICO`

* **Problema:** O campo "Evidência no documento do concorrente" hoje retorna descrições genéricas do que a IA fez (ex.: "Consulta ao sítio eletrônico oficial do órgão emitente da certidão", "Análise da documentação técnica apresentada pelo concorrente"), e não uma citação literal do PDF com página e trecho[cite: 1].
* **Por que importa:** Sem apontar exatamente onde está o vício no documento, o usuário não tem como sustentar o recurso perante o pregoeiro[cite: 1]. Essa é a peça de maior valor jurídico do produto e hoje ela não existe de fato[cite: 1].
* **O que precisa ser feito:** Implementar extração com referência de página/trecho (RAG com citação de origem), de forma que cada não conformidade aponte o número da página e o texto exato do documento que comprova o problema[cite: 1].

---

### 2.2. Auto-preenchimento dos dados da empresa no recurso e na mensagem
> **Prioridade:** `CRÍTICO`

* **Problema:** O recurso administrativo e a mensagem ao pregoeiro são entregues com placeholders vazios: `[nome do recorrente]`, `[endereço completo]`, `[número do CNPJ]`[cite: 1].
* **Por que importa:** O documento final precisa parecer "pronto para protocolo", como o produto promete[cite: 1]. Placeholders visíveis passam a impressão de produto incompleto para o cliente pagante[cite: 1].
* **O que precisa ser feito:** Criar cadastro de dados da empresa (razão social, CNPJ, endereço) no perfil do usuário e preencher automaticamente esses campos no recurso e na mensagem gerados[cite: 1].

---

### 2.3. Suporte a PDFs escaneados (OCR) e a arquivos grandes
> **Prioridade:** `CRÍTICO`

* **Problema:** O sistema hoje exige que o PDF tenha texto selecionável e emite aviso de que arquivos grandes (ex.: 16,1 MB) podem ser truncados[cite: 1].
* **Por que importa:** Editais e documentos de concorrentes frequentemente chegam escaneados ou em alta resolução[cite: 1]. Se o sistema falha nesses casos, ele falha justamente na sessão de pregão, quando o usuário mais precisa da ferramenta[cite: 1].
* **O que precisa ser feito:** Implementar OCR para documentos escaneados e revisar o processamento para lidar com arquivos grandes sem truncar conteúdo relevante (ex.: dividir em seções antes de enviar para análise)[cite: 1].

---

### 2.4. Aviso de responsabilidade (disclaimer) visível na tela de resultados
> **Prioridade:** `ALTO`

* **Problema:** O produto já foi concebido com a premissa de que a análise aponta fundamentos, mas não garante o sucesso do recurso, e que a validação final é de quem está participando do pregão — o próprio licitante, um técnico em licitações ou um advogado usando a ferramenta ali na hora[cite: 1]. Hoje esse limite existe apenas na documentação interna do produto, não aparece para o usuário na tela de resultado[cite: 1].
* **Por que importa:** Como a responsabilidade de julgar a validade jurídica da análise é de quem está usando a ferramenta no pregão, esse limite precisa estar visível exatamente no momento em que a análise é entregue — e não apenas em um documento interno ou nos Termos de Uso, que o usuário pode nunca ler[cite: 1].
* **O que precisa ser feito:** Adicionar um aviso fixo (banner ou nota) na tela de resultado, junto ao recurso administrativo e à mensagem ao pregoeiro, informando que a análise é um apoio técnico e que a validação jurídica final é de responsabilidade de quem utiliza a ferramenta no pregão, com link para os Termos de Uso[cite: 1].

---

### 2.5. Camada de verificação para evitar respostas sem base documental (anti-alucinação)
> **Prioridade:** `ALTO`

* **Problema:** O sistema sempre retorna irregularidades com aparência de certeza total; não há indicação de baixa confiança ou de necessidade de revisão manual quando a base documental é insuficiente[cite: 1].
* **Por que importa:** Um apontamento jurídico incorreto pode gerar um recurso inválido e prejudicar a credibilidade do produto e do cliente perante o pregoeiro[cite: 1].
* **O que precisa ser feito:** Adicionar uma checagem de confiança: quando a IA não tiver suporte documental claro para uma alegação, marcar o item como "verificação manual necessária" em vez de apresentá-lo como irregularidade confirmada[cite: 1].

---

### 2.6. Classificação de gravidade mais granular
> **Prioridade:** `ALTO`

* **Problema:** Hoje a classificação é binária: Material (insanável) ou Sanável[cite: 1]. Não há indicação de impacto no recurso nem de probabilidade de êxito[cite: 1].
* **Por que importa:** Nem toda irregularidade material tem o mesmo peso estratégico[cite: 1]. O usuário se beneficia de saber onde focar o recurso[cite: 1].
* **O que precisa ser feito:** Criar uma escala de risco (ex.: alto/médio/baixo impacto no recurso) além da classificação material/sanável já existente[cite: 1].

---

### 2.7. Extração determinística de dados objetivos (CPF/CNPJ, datas, validade de certidões)
> **Prioridade:** `MÉDIO`

* **Problema:** Hoje toda a leitura depende do modelo de IA interpretando o PDF; não há uma camada separada e determinística para extrair CPF/CNPJ, datas e prazos de validade[cite: 1].
* **Por que importa:** Dados objetivos como datas de validade não deveriam depender de interpretação de linguagem natural — o risco de erro é maior e desnecessário[cite: 1].
* **O que precisa ser feito:** Adicionar parsers/extratores dedicados para campos objetivos, usados como checagem cruzada do que a IA identificar[cite: 1].

---

### 2.8. Benchmark interno de qualidade
> **Prioridade:** `MÉDIO`

* **Problema:** Não existe hoje um conjunto fixo 0de editais e propostas antigas usado para medir a precisão do sistema ao longo do tempo[cite: 1].
* **Por que importa:** Sem isso, não é possível saber se uma mudança no sistema (prompt, modelo, versão) piorou ou melhorou a qualidade das análises[cite: 1].
* **O que precisa ser feito:** Montar uma base de 10 a 15 casos reais já resolvidos (com resultado conhecido) para rodar como teste de regressão a cada atualização do sistema[cite: 1].

---

### 2.9. Painel de métricas de qualidade e uso
> **Prioridade:** `ACOMPANHAMENTO`

* **Problema:** O painel Admin hoje mostra apenas histórico e plano; não há acompanhamento de tempo de resposta, taxa de acerto ou taxa de sucesso dos recursos gerados[cite: 1].
* **Por que importa:** Essas métricas serão necessárias tanto para decisões internas de melhoria quanto para eventual apresentação a investidores[cite: 1].
* **O que precisa ser feito:** Adicionar ao painel Admin: tempo médio de análise, taxa de irregularidades confirmadas pelo usuário e, quando possível, taxa de sucesso do recurso protocolado[cite: 1].

---

## 3. Observação Final

Os itens **2.1 a 2.3 (Críticos)** devem ser resolvidos antes de qualquer teste com Design Partners externos, pois afetam diretamente a confiabilidade jurídica do produto[cite: 1]. O item **2.4 (disclaimer visível)** deve entrar junto com esses três, já que reforça exatamente o mesmo momento de entrega da análise ao usuário[cite: 1]. Os itens **2.5 e 2.6 (Alto)** são recomendados ainda na fase de testes fechados[cite: 1]. Os itens **2.7 a 2.9** podem ser tratados em paralelo, sem bloquear o cronograma comercial[cite: 1].