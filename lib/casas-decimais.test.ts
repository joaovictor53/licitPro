import test from 'node:test'
import assert from 'node:assert/strict'
import { aplicarRegra, formatarPrecoUnitario, sugerirNoTexto, type RegraCasasDecimais } from './casas-decimais'

const edital = (corpo: string, pagina = 7) => `[[PÁGINA 1]]\n1. DO OBJETO\nContratação de serviços.\n\n[[PÁGINA ${pagina}]]\n${corpo}`

test('lê "duas casas decimais" no preço unitário, com a página', () => {
  const r = sugerirNoTexto(edital('8.3. O valor unitário da proposta deverá ser apresentado com duas casas decimais depois da vírgula.'))
  assert.equal(r?.casas, 2)
  assert.equal(r?.modo, 'maximo')
  assert.equal(r?.referencia.pagina, 7)
  assert.equal(r?.referencia.item, '8.3')
  assert.equal(r?.conferir, false)
})

test('lê "somente as duas primeiras" como truncar', () => {
  const r = sugerirNoTexto(edital('Quando o valor unitário tiver mais de duas casas decimais, somente serão consideradas as duas primeiras, desprezadas as demais.'))
  assert.equal(r?.modo, 'truncar')
  assert.equal(r?.casas, 2)
})

test('com dois números, vale o do preço unitário', () => {
  const r = sugerirNoTexto(edital('O preço total terá duas casas decimais; o preço unitário terá até quatro casas decimais.'))
  assert.equal(r?.casas, 4)
})

test('casas decimais de desconto, índice ou percentual não são do preço', () => {
  assert.equal(sugerirNoTexto(edital('O índice de liquidez será calculado com duas casas decimais.')), null)
  assert.equal(sugerirNoTexto(edital('O percentual de desconto terá três casas decimais.')), null)
})

test('"no mínimo" não é teto: manda conferir', () => {
  const r = sugerirNoTexto(edital('O valor unitário deve ter no mínimo três casas decimais.'))
  assert.equal(r?.casas, 3)
  assert.equal(r?.conferir, true)
})

test('edital sem regra: null', () => {
  assert.equal(sugerirNoTexto(edital('O prazo de entrega é de 15 dias.')), null)
  assert.equal(sugerirNoTexto(''), null)
})

const referencia = { pagina: 7, item: '8.3', trecho: 'x' }
const maximo2: RegraCasasDecimais = { casas: 2, modo: 'maximo', conferir: false, referencia }
const trunca2: RegraCasasDecimais = { casas: 2, modo: 'truncar', conferir: false, referencia }
const maximo4: RegraCasasDecimais = { casas: 4, modo: 'maximo', conferir: false, referencia }

test('sem regra: 3 casas é recusado, nunca arredondado', () => {
  const r = aplicarRegra('12,345', null)
  assert.equal(r.valor, null)
  assert.match(r.mensagem, /padrão do sistema/)
  assert.equal(aplicarRegra('12,34', null).valor, '12.34')
})

test('máximo: aceita até N casas e recusa o excesso citando a página', () => {
  assert.equal(aplicarRegra('12,3456', maximo4).valor, '12.3456')
  const r = aplicarRegra('12,34567', maximo4)
  assert.equal(r.valor, null)
  assert.match(r.mensagem, /pág\. 7, item 8\.3/)
  assert.equal(aplicarRegra('12,3400', maximo2).valor, '12.34') // zeros à direita não contam
})

test('truncar: corta sem arredondar e avisa', () => {
  const r = aplicarRegra('12,349', trunca2)
  assert.equal(r.valor, '12.34')
  assert.match(r.mensagem, /desprezadas, sem arredondar/)
  assert.equal(aplicarRegra('12,34', trunca2).mensagem, '')
})

test('excesso além das 6 casas internas também é detectado', () => {
  assert.equal(aplicarRegra('1.00000001', maximo4).valor, null)
})

test('entrada inválida', () => {
  assert.equal(aplicarRegra('abc', null).valor, null)
  assert.equal(aplicarRegra('', null).valor, null)
})

test('formata preço com as casas que o edital permite, com milhar brasileiro', () => {
  assert.equal(formatarPrecoUnitario(12.3456, 4), '12,3456')
  assert.equal(formatarPrecoUnitario(12.3, 4), '12,30')
  assert.equal(formatarPrecoUnitario(1234567.5, 2), '1.234.567,50')
  assert.equal(formatarPrecoUnitario(null), '')
})
