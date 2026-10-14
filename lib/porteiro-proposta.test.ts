import test from 'node:test'
import assert from 'node:assert/strict'
import { gerarDocumentoProposta, formatarQuantidade, formatarReais } from './documento-proposta'
import { conferirPdfProposta, conferirTextoProposta, extrairTextoPdf, lerNumeroBr } from './porteiro-proposta'
import { montarSnapshotItem } from './composicao-preco'

const item = (ordem: number, quantidade: number, precoOfertado: number | null, descricao = `Item de teste ${ordem}`) =>
  montarSnapshotItem({
    id: String(ordem), ordem, descricao, unidade: 'un', quantidade, marcaModelo: null,
    custoUnitario: 1, pisoUnitario: null, alvoUnitario: null, tetoUnitario: null, precoOfertado,
  })

const dadosBase = (itens: ReturnType<typeof item>[]) => ({
  empresa: { razaoSocial: 'Empresa Teste Ltda', cnpj: '00.000.000/0001-00', endereco: 'Rua A, 1', identidadeVisual: null },
  participacao: { orgao: 'Órgão X', objeto: 'Objeto de teste', numeroProcesso: null, modalidade: null },
  itens,
  totalGeral: itens.reduce((s, i) => s + i.avaliacao.totalItem, 0),
})

test('formatos brasileiros', () => {
  assert.equal(formatarReais(1234.5), '1.234,50')
  assert.equal(formatarQuantidade(3), '3')
  assert.equal(formatarQuantidade(1.5), '1,5')
  assert.equal(formatarQuantidade(1500), '1.500')
  assert.equal(lerNumeroBr('1.500'), 1500)
  assert.equal(lerNumeroBr('12,3456'), 12.3456)
  assert.equal(lerNumeroBr('abc'), null)
})

test('PDF gerado de ponta a ponta é LIBERADO (preço de 4 casas, milhar, texto longo)', async () => {
  const itens = [
    item(1, 3, 12.3456),
    item(2, 1500, 0.99),
    item(3, 2, 19.99, 'Descrição bem longa '.repeat(20)),
  ]
  const dados = dadosBase(itens)
  const pdf = await gerarDocumentoProposta(dados)
  const texto = await extrairTextoPdf(pdf)
  assert.match(texto, /Item 1: 3 un x R\$ 12,3456 = R\$ 37,04/)
  assert.match(texto, /Item 2: 1\.500 un x R\$ 0,99 = R\$ 1\.485,00/)
  assert.match(texto, /Valor total por extenso: .+ reais/)
  const r = await conferirPdfProposta(pdf, { itens, totalGeral: dados.totalGeral })
  assert.deepEqual(r.problemas, [])
  assert.equal(r.veredito, 'LIBERADO')
})

test('caractere que a fonte não desenha não derruba a geração', async () => {
  const itens = [item(1, 1, 10, 'Cabo ≥ 2 metros ✓')]
  const dados = dadosBase(itens)
  const pdf = await gerarDocumentoProposta(dados)
  assert.equal((await conferirPdfProposta(pdf, { itens, totalGeral: dados.totalGeral })).veredito, 'LIBERADO')
})

test('bloqueia item sem preço e total divergente do calculado', async () => {
  const itens = [item(1, 2, 10), item(2, 1, null)]
  const pdf = await gerarDocumentoProposta(dadosBase([itens[0]]))
  const r = await conferirPdfProposta(pdf, { itens, totalGeral: 99 })
  assert.equal(r.veredito, 'BLOQUEADO')
  const codigos = r.problemas.map((p) => `${p.codigo}:${p.ordemItem ?? ''}`)
  assert.ok(codigos.includes('item:2'))
  assert.ok(r.problemas.some((p) => p.codigo === 'total' && /não é o total calculado/.test(p.mensagem)))
})

const base = `Item 1: 3 un x R$ 12,3456 = R$ 37,04\nTotal geral: R$ 37,04\nValor total por extenso: trinta e sete reais e quatro centavos.`
const esperada = { itens: [item(1, 3, 12.3456)], totalGeral: 37.04 }

test('texto correto é liberado', () => {
  assert.equal(conferirTextoProposta(base, esperada).veredito, 'LIBERADO')
})

test('conta errada no PDF: quantidade × preço ≠ total', () => {
  const r = conferirTextoProposta(base.replace('= R$ 37,04', '= R$ 37,05'), esperada)
  assert.ok(r.problemas.some((p) => p.codigo === 'conta' && /37\.04, mas o PDF mostra 37\.05/.test(p.mensagem)))
})

test('preço no PDF diferente do informado', () => {
  const r = conferirTextoProposta(base.replace('12,3456', '12,35').replace('37,04', '37,05'), esperada)
  assert.ok(r.problemas.some((p) => /não é o informado/.test(p.mensagem)))
})

test('marcador sem resolver, None e extenso errado', () => {
  const r = conferirTextoProposta(`${base}\nPrazo: None {{validade}}`.replace('trinta e sete', 'trinta e oito'), esperada)
  const codigos = r.problemas.map((p) => p.codigo)
  assert.ok(codigos.includes('campo'))
  assert.ok(codigos.includes('extenso'))
  assert.equal(r.veredito, 'BLOQUEADO')
})

test('item duplicado ou sobrando', () => {
  const r = conferirTextoProposta(`${base}\nItem 1: 3 un x R$ 12,3456 = R$ 37,04\nItem 9: 1 un x R$ 1,00 = R$ 1,00`, esperada)
  assert.ok(r.problemas.some((p) => /aparece 2 vezes/.test(p.mensagem)))
  assert.ok(r.problemas.some((p) => /Item 9/.test(p.mensagem)))
})

test('PDF ilegível bloqueia em vez de estourar', async () => {
  const r = await conferirPdfProposta(Buffer.from('isto não é um pdf'), esperada)
  assert.equal(r.veredito, 'BLOQUEADO')
  assert.equal(r.problemas[0].codigo, 'leitura')
})

import { lerCamposExigidos, linhasDeCondicoes, avaliarCondicoesProposta } from './exigencias-proposta'

const editalCondicoes = `[[PÁGINA 5]]\nA proposta terá validade mínima de 60 dias.\nO licitante deverá informar a marca de cada item.\n[[PÁGINA 9]]\nO prazo máximo de entrega é de 15 dias.`
const campos = lerCamposExigidos(editalCondicoes)

test('avaliarCondicoesProposta: falta valor, prazo pior e marca por item', () => {
  const itens = [{ ordem: 1, marcaModelo: 'Acme' }, { ordem: 2, marcaModelo: null }]
  const pend = avaliarCondicoesProposta(campos, { validade_proposta: { valor: '45', unidade: 'dias' } }, itens)
  assert.equal(pend.length, 3)
  assert.ok(pend.some((p) => /Validade da proposta.*no mínimo 60 dias/.test(p)))
  assert.ok(pend.some((p) => /Prazo de entrega: informe/.test(p)))
  assert.ok(pend.some((p) => /Marca.*item\(ns\) 2/.test(p)))
  const ok = avaliarCondicoesProposta(
    campos, { validade_proposta: { valor: '60', unidade: 'dias' }, prazo_entrega: { valor: '10', unidade: 'dias' } },
    [{ ordem: 1, marcaModelo: 'Acme' }]
  )
  assert.deepEqual(ok, [])
})

test('PDF com as condições exigidas é liberado; sem elas, ou piores, é bloqueado', async () => {
  const itens = [{ ...item(1, 2, 10), marcaModelo: 'Acme X1' }]
  const dados = dadosBase(itens)
  const valores = { validade_proposta: { valor: '60', unidade: 'dias' as const }, prazo_entrega: { valor: '10', unidade: 'dias' as const } }

  const bom = await gerarDocumentoProposta({ ...dados, condicoes: linhasDeCondicoes(campos, valores) })
  assert.deepEqual((await conferirPdfProposta(bom, { itens, totalGeral: dados.totalGeral, campos })).problemas, [])

  const sem = await gerarDocumentoProposta(dados)
  const rSem = await conferirPdfProposta(sem, { itens, totalGeral: dados.totalGeral, campos })
  assert.equal(rSem.veredito, 'BLOQUEADO')
  assert.ok(rSem.problemas.some((p) => p.codigo === 'condicao' && /ausente no PDF/.test(p.mensagem)))

  const pior = await gerarDocumentoProposta({
    ...dados, condicoes: linhasDeCondicoes(campos, { ...valores, prazo_entrega: { valor: '30', unidade: 'dias' } }),
  })
  const rPior = await conferirPdfProposta(pior, { itens, totalGeral: dados.totalGeral, campos })
  assert.ok(rPior.problemas.some((p) => /Prazo de entrega: o edital exige no máximo 15 dias/.test(p.mensagem)))
})
