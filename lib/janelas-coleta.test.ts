import test from 'node:test'
import assert from 'node:assert/strict'
import { chaveDaVarredura, gerarJanelas, planejarVarreduras, type StatusVarredura } from './janelas-coleta'

const hoje = new Date(2026, 9, 15) // 15/10/2026

test('fatia o período em janelas da mais recente para a mais antiga, sem buracos', () => {
  assert.deepEqual(gerarJanelas(hoje, 20, 7), [
    { inicial: '20261009', final: '20261015' },
    { inicial: '20261002', final: '20261008' },
    { inicial: '20260925', final: '20261001' },
  ])
})

test('a última janela é cortada no limite do período', () => {
  const janelas = gerarJanelas(hoje, 10, 7)
  assert.deepEqual(janelas[janelas.length - 1], { inicial: '20261005', final: '20261008' })
})

test('janela completa do passado é pulada; a que contém hoje é sempre refeita', () => {
  const registradas = new Map<string, StatusVarredura>()
  for (const j of gerarJanelas(hoje, 20, 7)) {
    registradas.set(chaveDaVarredura({ ...j, uf: 'AM', modalidade: 6 }), 'completa')
  }
  const pendentes = planejarVarreduras({
    hoje, dias: 20, tamanhoJanela: 7, ufs: ['AM'], modalidades: [6], registradas,
  })
  assert.deepEqual(pendentes.map((p) => p.inicial), ['20261009'])
})

test('janela incompleta ou com erro volta para a fila; refazer ignora o que estava completo', () => {
  const registradas = new Map<string, StatusVarredura>([
    [chaveDaVarredura({ inicial: '20261002', final: '20261008', uf: 'AM', modalidade: 6 }), 'incompleta'],
    [chaveDaVarredura({ inicial: '20260925', final: '20261001', uf: 'AM', modalidade: 6 }), 'erro'],
  ])
  const base = { hoje, dias: 20, tamanhoJanela: 7, ufs: ['AM'], modalidades: [6], registradas }
  assert.equal(planejarVarreduras(base).length, 3)

  registradas.set(chaveDaVarredura({ inicial: '20260925', final: '20261001', uf: 'AM', modalidade: 6 }), 'completa')
  assert.equal(planejarVarreduras(base).length, 2)
  assert.equal(planejarVarreduras({ ...base, refazer: true }).length, 3)
})

test('cruza UFs e modalidades', () => {
  const pendentes = planejarVarreduras({
    hoje, dias: 5, tamanhoJanela: 7, ufs: ['AM', 'PA'], modalidades: [6, 8], registradas: new Map(),
  })
  assert.equal(pendentes.length, 4)
})
