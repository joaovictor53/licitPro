import test from 'node:test'
import assert from 'node:assert/strict'
import { conferirCondicao, lerCamposExigidos } from './exigencias-proposta'

const edital = `[[PÁGINA 1]]
1. DO OBJETO
Aquisição de materiais.
[[PÁGINA 5]]
7.1. A proposta terá validade mínima de 60 (sessenta) dias, contados da sessão.
7.2. O licitante deverá informar a marca e o modelo de cada item.
[[PÁGINA 9]]
12.1. O prazo máximo de entrega é de 15 (quinze) dias corridos após a nota de empenho.
12.2. O prazo de pagamento será de 30 dias após o recebimento.
13.1. Garantia mínima do produto de 12 meses.
14.1. A empresa deverá informar os dados bancários para pagamento.`

test('lê os campos críticos com página e limite', () => {
  const campos = Object.fromEntries(lerCamposExigidos(edital).map((c) => [c.id, c]))
  assert.equal(campos.validade_proposta.limite, 60)
  assert.equal(campos.validade_proposta.unidade, 'dias')
  assert.equal(campos.validade_proposta.sentido, 'minimo')
  assert.equal(campos.validade_proposta.referencia.pagina, 5)
  assert.equal(campos.prazo_entrega.limite, 15)
  assert.equal(campos.prazo_entrega.sentido, 'maximo')
  assert.equal(campos.prazo_entrega.referencia.pagina, 9)
  assert.equal(campos.garantia.limite, 12)
  assert.equal(campos.garantia.unidade, 'meses')
  assert.ok(campos.marca)
  assert.ok(campos.modelo)
  assert.ok(campos.dados_bancarios)
  assert.equal(campos.fabricante, undefined)
})

test('o prazo de pagamento não vira o limite da entrega', () => {
  const campos = lerCamposExigidos('[[PÁGINA 2]]\nO prazo de pagamento será de 30 dias e o prazo de entrega será de 10 dias.')
  assert.equal(campos.find((c) => c.id === 'prazo_entrega')?.limite, 10)
})

test('a validade citada junto da entrega não vira o teto da entrega', () => {
  const campos = lerCamposExigidos('[[PÁGINA 2]]\nO prazo de validade da proposta é de 60 dias. A entrega será em até 10 dias.')
  assert.equal(campos.find((c) => c.id === 'validade_proposta')?.limite, 60)
  assert.equal(campos.find((c) => c.id === 'prazo_entrega')?.limite, 10)
})

test('decimal não vira limite ("1,5 anos")', () => {
  const campos = lerCamposExigidos('[[PÁGINA 1]]\nPrazo de garantia de 1,5 anos.')
  assert.equal(campos.find((c) => c.id === 'garantia')?.limite, null)
})

test('conta corrente do órgão não é dado bancário da proposta', () => {
  assert.equal(lerCamposExigidos('[[PÁGINA 1]]\nA caução será depositada na conta corrente do órgão.').length, 0)
})

test('edital sem condições: lista vazia', () => {
  assert.deepEqual(lerCamposExigidos('[[PÁGINA 1]]\nO objeto é a compra de papel.'), [])
  assert.deepEqual(lerCamposExigidos(''), [])
})

const campos = Object.fromEntries(lerCamposExigidos(edital).map((c) => [c.id, c]))

test('validade menor que o mínimo é recusada; igual ou maior passa', () => {
  assert.equal(conferirCondicao(campos.validade_proposta, { valor: 45 }).ok, false)
  assert.match(conferirCondicao(campos.validade_proposta, { valor: 45 }).mensagem, /no mínimo 60 dias \(edital, pág\. 5\)/)
  assert.equal(conferirCondicao(campos.validade_proposta, { valor: 60 }).ok, true)
  assert.equal(conferirCondicao(campos.validade_proposta, { valor: 90 }).ok, true)
})

test('entrega maior que o máximo é recusada', () => {
  assert.equal(conferirCondicao(campos.prazo_entrega, { valor: 20 }).ok, false)
  assert.equal(conferirCondicao(campos.prazo_entrega, { valor: 15 }).ok, true)
  assert.equal(conferirCondicao(campos.prazo_entrega, { valor: 10 }).ok, true)
})

test('compara em dias entre unidades (garantia 12 meses × 1 ano × 6 meses)', () => {
  assert.equal(conferirCondicao(campos.garantia, { valor: 1, unidade: 'anos' }).ok, true)
  assert.equal(conferirCondicao(campos.garantia, { valor: 6, unidade: 'meses' }).ok, false)
  assert.equal(conferirCondicao(campos.garantia, { valor: 12, unidade: 'meses' }).ok, true)
})

test('prazo vazio ou inválido e texto vazio são recusados', () => {
  assert.equal(conferirCondicao(campos.validade_proposta, null).ok, false)
  assert.equal(conferirCondicao(campos.validade_proposta, { valor: 'abc' }).ok, false)
  assert.equal(conferirCondicao(campos.marca, { valor: '  ' }).ok, false)
  assert.equal(conferirCondicao(campos.marca, { valor: 'Acme' }).ok, true)
})

test('sem limite lido, aceita o prazo informado', () => {
  const semLimite = { ...campos.garantia, limite: null, unidade: null }
  assert.equal(conferirCondicao(semLimite, { valor: 3 }).ok, true)
})
