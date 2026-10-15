import test from 'node:test'
import assert from 'node:assert/strict'
import { descricoesDosItens, lerNumeroControlePncp } from './radar-itens'

test('lê cnpj, ano e sequencial do número de controle, com ou sem prefixo da fonte', () => {
  const esperado = { cnpj: '22812242000112', ano: '2027', sequencial: '4' }
  assert.deepEqual(lerNumeroControlePncp('22812242000112-1-000004/2027'), esperado)
  assert.deepEqual(lerNumeroControlePncp('pncp:22812242000112-1-000004/2027'), esperado)
})

test('número de controle fora do formato devolve null', () => {
  assert.equal(lerNumeroControlePncp('pcp:12345'), null)
})

test('extrai só descrições preenchidas, com espaços normalizados', () => {
  assert.deepEqual(
    descricoesDosItens([{ descricao: '  Arroz   tipo 1 ' }, { descricao: '' }, { numeroItem: 3 }, null]),
    ['Arroz tipo 1']
  )
  assert.deepEqual(descricoesDosItens({ erro: true }), [])
})
