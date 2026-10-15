import test from 'node:test'
import assert from 'node:assert/strict'
import { classificarTexto, regrasPadrao, termosDeBusca } from './classificacao-radar'

const regras = regrasPadrao(termosDeBusca(['alimentação escolar', 'merenda', 'hortifruti', 'gás']), ['veículo'])

test('expressão com mais de uma palavra vale 2 e basta para ser relevante', () => {
  const r = classificarTexto('Contratação de gêneros para ALIMENTAÇÃO ESCOLAR', regras)
  assert.equal(r.categoria, 'relevante')
  assert.equal(r.nota, 2)
})

test('uma palavra simples só dá "talvez"; duas somam e viram relevante', () => {
  assert.equal(classificarTexto('Aquisição de merenda', regras).categoria, 'talvez')
  const dois = classificarTexto('Aquisição de merenda e hortifruti', regras)
  assert.equal(dois.categoria, 'relevante')
  assert.equal(dois.nota, 2)
})

test('o mesmo termo não é contado duas vezes', () => {
  assert.equal(classificarTexto('merenda, merenda e mais merenda', regras).nota, 1)
})

test('sem nenhum termo é irrelevante', () => {
  const r = classificarTexto('Serviços de engenharia civil', regras)
  assert.equal(r.categoria, 'irrelevante')
  assert.equal(r.nota, 0)
})

test('exclusão derruba mesmo com termos de interesse', () => {
  const r = classificarTexto('Veículo para transporte da alimentação escolar', regras)
  assert.equal(r.categoria, 'irrelevante')
  assert.equal(r.exclusaoEncontrada, 'veículo')
})

test('termo curto só casa como palavra inteira', () => {
  assert.equal(classificarTexto('Aquisição de gasolina comum', regras).categoria, 'irrelevante')
  assert.equal(classificarTexto('Recarga de gás de cozinha', regras).categoria, 'talvez')
})

test('ignora acento e caixa', () => {
  assert.equal(classificarTexto('ALIMENTACAO ESCOLAR', regras).categoria, 'relevante')
})
