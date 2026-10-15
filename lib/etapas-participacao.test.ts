import test from 'node:test'
import assert from 'node:assert/strict'
import { ESTADOS_PARTICIPACAO } from '../types/participacao-tipos'
import {
  ETAPAS, faseDoPainelDoEstado, FASES_DO_PAINEL, indiceDaEtapaDaPagina, indiceDaEtapaDoEstado, progressoDoProcesso, ROTULOS_ESTADO, situacaoDaEtapa,
} from './etapas-participacao'

test('todo estado, menos descartada, cai em exatamente uma etapa', () => {
  for (const estado of ESTADOS_PARTICIPACAO) {
    const etapas = ETAPAS.filter((e) => (e.estados as string[]).includes(estado))
    assert.equal(etapas.length, estado === 'descartada' ? 0 : 1, estado)
  }
})

test('todo estado tem rótulo', () => {
  for (const estado of ESTADOS_PARTICIPACAO) assert.ok(ROTULOS_ESTADO[estado], estado)
})

test('as treze páginas de ferramenta pertencem a alguma etapa, sem repetir', () => {
  const caminhos = ETAPAS.flatMap((e) => e.paginas.map((p) => p.caminho))
  assert.equal(new Set(caminhos).size, caminhos.length)
  for (const esperado of ['', 'recurso', 'documentos', 'viabilidade', 'decisao', 'precos', 'proposta', 'aprovacao', 'upload', 'envio', 'sessao', 'habilitacao', 'recurso-fase', 'resultado']) {
    assert.notEqual(indiceDaEtapaDaPagina(esperado), null, esperado)
  }
  assert.equal(indiceDaEtapaDaPagina('inexistente'), null)
})

test('situação das etapas conforme o estado', () => {
  assert.equal(situacaoDaEtapa(0, 'em_composicao_de_preco'), 'concluida')
  assert.equal(situacaoDaEtapa(1, 'em_composicao_de_preco'), 'concluida')
  assert.equal(situacaoDaEtapa(2, 'em_composicao_de_preco'), 'atual')
  assert.equal(situacaoDaEtapa(3, 'em_composicao_de_preco'), 'futura')
  assert.equal(situacaoDaEtapa(0, 'descartada'), 'futura')
})

test('progresso cresce com o avanço e é 0 para descartada', () => {
  assert.equal(progressoDoProcesso('descartada'), 0)
  assert.ok(progressoDoProcesso('identificada') < progressoDoProcesso('em_elaboracao'))
  assert.ok(progressoDoProcesso('encerrada') < 100 && progressoDoProcesso('encerrada') > 90)
})

test('fases do painel cobrem todas as etapas uma vez', () => {
  const etapas = FASES_DO_PAINEL.flatMap((f) => f.etapas)
  assert.deepEqual([...etapas].sort(), ETAPAS.map((e) => e.id).sort())
  assert.equal(faseDoPainelDoEstado('em_elaboracao'), 'propor')
  assert.equal(faseDoPainelDoEstado('em_disputa'), 'disputar')
  assert.equal(faseDoPainelDoEstado('descartada'), null)
  assert.equal(indiceDaEtapaDoEstado('lixo'), null)
})
