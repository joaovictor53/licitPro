import test from 'node:test'
import assert from 'node:assert/strict'
import { arredondarCentavos, atingeFracao, multiplicarEmCentavos, percentual, somar, subtrair } from './dinheiro'
import { avaliarItemPreco, calcularTotaisPlanilha } from './composicao-preco'

test('arredonda metade para cima, o que Math.round(x*100)/100 erra', () => {
  assert.equal(Math.round(1.005 * 100) / 100, 1) // o comportamento antigo
  assert.equal(arredondarCentavos(1.005), 1.01)
  assert.equal(arredondarCentavos(2.675), 2.68)
  assert.equal(arredondarCentavos(-2.675), -2.68) // metade afastando do zero, como ROUND_HALF_UP
})

test('preço unitário de 4 casas × quantidade, arredondado só no total do item', () => {
  assert.equal(multiplicarEmCentavos(12.3456, 3), 37.04) // 37.0368
  assert.equal(multiplicarEmCentavos(0.115, 10), 1.15)
  assert.equal(multiplicarEmCentavos(1.005, 1), 1.01)
  assert.equal(multiplicarEmCentavos(19.99, 1.5), 29.99) // 29.985 -> 29.99
})

test('soma e subtração sem resíduo de ponto flutuante', () => {
  assert.equal(0.1 + 0.2 === 0.3, false)
  assert.equal(somar([0.1, 0.2]), 0.3)
  assert.equal(subtrair(0.3, 0.1), 0.2)
})

test('percentual a 2 casas e denominador não positivo', () => {
  assert.equal(percentual(1, 3), 33.33)
  assert.equal(percentual(2, 3), 66.67)
  assert.equal(percentual(5, 0), null)
})

test('"perto do teto" a 95% exato', () => {
  assert.equal(atingeFracao(9.5, 10, 95), true)
  assert.equal(atingeFracao(9.4999, 10, 95), false)
})

test('avaliarItemPreco: total do item exato e situação', () => {
  const base = {
    id: 'a', ordem: 1, descricao: 'x', unidade: 'un', quantidade: 3, marcaModelo: null,
    custoUnitario: 8, pisoUnitario: 9, alvoUnitario: 11, tetoUnitario: 20,
  }
  const r = avaliarItemPreco({ ...base, precoOfertado: 12.3456 })
  assert.equal(r.totalItem, 37.04)
  assert.equal(r.situacao, 'no_alvo')
  assert.equal(r.margemUnitaria, 4.35) // 4.3456
  assert.equal(avaliarItemPreco({ ...base, precoOfertado: 19 }).situacao, 'perto_teto')
  assert.equal(avaliarItemPreco({ ...base, precoOfertado: 8.5 }).situacao, 'abaixo_piso')
})

test('calcularTotaisPlanilha: soma de itens sem erro acumulado', () => {
  const item = (n: number) => ({
    id: String(n), ordem: n, descricao: 'x', unidade: null, quantidade: 1, marcaModelo: null,
    custoUnitario: 0.1, pisoUnitario: null, alvoUnitario: null, tetoUnitario: null, precoOfertado: 0.2,
  })
  const t = calcularTotaisPlanilha([item(1), item(2), item(3)], 1)
  assert.equal(t.totalGeral, 0.6)
  assert.equal(t.totalCusto, 0.3)
  assert.equal(t.margemConsolidadaValor, 0.3)
  assert.equal(t.margemConsolidadaPercentual, 50)
  assert.equal(t.diferencaValorEstimado, -0.4)
})
