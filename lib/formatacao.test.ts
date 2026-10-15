import test from 'node:test'
import assert from 'node:assert/strict'
import { descreverPrazo, diasAte, formatarData, formatarMoeda } from './formatacao'

test('moeda e valores ausentes', () => {
  assert.match(formatarMoeda('1234.5'), /R\$\s?1\.234,50/)
  assert.equal(formatarMoeda(null), '—')
  assert.equal(formatarMoeda('abc'), '—')
})

test('dias até uma data contam pelo calendário, não por 24 horas', () => {
  const agora = new Date(2026, 9, 14, 23, 30)
  assert.equal(diasAte(new Date(2026, 9, 15, 0, 10), agora), 1)
  assert.equal(diasAte(new Date(2026, 9, 14, 8, 0), agora), 0)
  assert.equal(diasAte(new Date(2026, 9, 12, 8, 0), agora), -2)
  assert.equal(diasAte(null, agora), null)
  assert.equal(diasAte('lixo', agora), null)
})

test('descrição do prazo', () => {
  assert.equal(descreverPrazo(0), 'hoje')
  assert.equal(descreverPrazo(1), 'amanhã')
  assert.equal(descreverPrazo(5), 'em 5 dias')
  assert.equal(descreverPrazo(-3), 'há 3 dias')
  assert.equal(descreverPrazo(null), '—')
})

test('data inválida vira traço', () => {
  assert.equal(formatarData('nada'), '—')
})
