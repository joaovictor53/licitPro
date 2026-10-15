import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularSemaforoOrgao } from './semaforo-orgao'

const ind = (prazoMedioDias: number | null, quantidadeContratos: number, atrasosRegistrados: number) => ({
  prazoMedioDias,
  quantidadeContratos,
  atrasosRegistrados,
})

test('sem histórico é cinza com motivo, nunca verde', () => {
  const r = calcularSemaforoOrgao(ind(null, 0, 0))
  assert.equal(r.cor, 'cinza')
  assert.equal(r.pontos, null)
  assert.match(r.motivos[0], /Sem histórico/)
})

test('amostra pequena é cinza mesmo com prazo bom', () => {
  assert.equal(calcularSemaforoOrgao(ind(10, 2, 0)).cor, 'cinza')
})

test('prazo medido ausente é cinza', () => {
  assert.equal(calcularSemaforoOrgao(ind(null, 5, 0)).cor, 'cinza')
})

test('prazo curto e sem atraso é verde', () => {
  const r = calcularSemaforoOrgao(ind(20, 5, 0))
  assert.equal(r.cor, 'verde')
  assert.equal(r.pontos, 0)
})

test('prazo médio de 45 dias dá amarelo', () => {
  assert.equal(calcularSemaforoOrgao(ind(45, 5, 0)).cor, 'amarelo')
})

test('prazo longo com atrasos acumulados dá vermelho', () => {
  const r = calcularSemaforoOrgao(ind(90, 6, 4))
  assert.equal(r.cor, 'vermelho')
  assert.equal(r.pontos, 4)
})

test('atrasos sozinhos pesam, mas um ou dois só chegam ao amarelo', () => {
  assert.equal(calcularSemaforoOrgao(ind(20, 5, 2)).cor, 'amarelo')
})
