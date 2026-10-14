import test from 'node:test'
import assert from 'node:assert/strict'
import { inteiroPorExtenso, valorPorExtenso } from './valor-por-extenso'

test('valores comuns', () => {
  assert.equal(valorPorExtenso(1250.5), 'mil duzentos e cinquenta reais e cinquenta centavos')
  assert.equal(valorPorExtenso(1), 'um real')
  assert.equal(valorPorExtenso(0), 'zero reais')
  assert.equal(valorPorExtenso(0.01), 'um centavo')
  assert.equal(valorPorExtenso(0.5), 'cinquenta centavos')
  assert.equal(valorPorExtenso(21), 'vinte e um reais')
})

test('centenas: cem x cento', () => {
  assert.equal(inteiroPorExtenso(100), 'cem')
  assert.equal(inteiroPorExtenso(101), 'cento e um')
  assert.equal(inteiroPorExtenso(999), 'novecentos e noventa e nove')
})

test('conector "e" nos milhares', () => {
  assert.equal(inteiroPorExtenso(1050), 'mil e cinquenta')
  assert.equal(inteiroPorExtenso(1200), 'mil e duzentos')
  assert.equal(inteiroPorExtenso(1250), 'mil duzentos e cinquenta')
  assert.equal(inteiroPorExtenso(2000200), 'dois milhões e duzentos')
  assert.equal(inteiroPorExtenso(2200000), 'dois milhões e duzentos mil')
  assert.equal(inteiroPorExtenso(2345678), 'dois milhões trezentos e quarenta e cinco mil seiscentos e setenta e oito')
  assert.equal(inteiroPorExtenso(1000), 'mil')
  assert.equal(inteiroPorExtenso(1000000), 'um milhão')
})

test('"de reais" em milhões redondos', () => {
  assert.equal(valorPorExtenso(1_000_000), 'um milhão de reais')
  assert.equal(valorPorExtenso(3_000_000), 'três milhões de reais')
  assert.equal(valorPorExtenso(1_000_000.5), 'um milhão de reais e cinquenta centavos')
})

test('arredonda para centavos, metade para cima', () => {
  assert.equal(valorPorExtenso(1.005), 'um real e um centavo')
  assert.equal(valorPorExtenso(0.994), 'noventa e nove centavos')
})

test('nunca inventa: null, negativo, NaN, acima do limite -> vazio', () => {
  assert.equal(valorPorExtenso(null), '')
  assert.equal(valorPorExtenso(undefined), '')
  assert.equal(valorPorExtenso(-1), '')
  assert.equal(valorPorExtenso(NaN), '')
  assert.equal(valorPorExtenso(Infinity), '')
  assert.equal(valorPorExtenso(1e15), '')
})
