import test from 'node:test'
import assert from 'node:assert/strict'
import { compararEditais } from './alteracoes-edital'

const base = {
  objeto: 'Aquisição de gêneros alimentícios',
  valorEstimado: '1000.5',
  dataEncerramentoProposta: new Date('2026-10-27T14:00:00Z'),
  linkOrigem: 'https://exemplo.gov.br/1',
}

test('edital igual não gera alteração, mesmo com formatos diferentes de número e data', () => {
  const atual = { ...base, valorEstimado: '1000.50', dataEncerramentoProposta: new Date('2026-10-27T14:00:00Z') }
  assert.deepEqual(compararEditais(base, atual), [])
})

test('espaços extras no objeto não contam como mudança', () => {
  assert.deepEqual(compararEditais(base, { ...base, objeto: 'Aquisição  de gêneros\nalimentícios ' }), [])
})

test('valor e prazo alterados aparecem com antes e depois', () => {
  const r = compararEditais(base, {
    ...base,
    valorEstimado: 2000,
    dataEncerramentoProposta: new Date('2026-11-03T14:00:00Z'),
  })
  assert.deepEqual(r.map((a) => a.campo), ['valorEstimado', 'dataEncerramentoProposta'])
  assert.equal(r[0].antes, '1000.50')
  assert.equal(r[0].depois, '2000.00')
  assert.equal(r[1].depois, '2026-11-03T14:00:00.000Z')
})

test('campo que sumiu da resposta não é tratado como alteração', () => {
  assert.deepEqual(compararEditais(base, { ...base, linkOrigem: null }), [])
})

test('campo que passou a existir é alteração com antes nulo', () => {
  const r = compararEditais({ ...base, linkOrigem: null }, base)
  assert.deepEqual(r, [{ campo: 'linkOrigem', antes: null, depois: 'https://exemplo.gov.br/1' }])
})
