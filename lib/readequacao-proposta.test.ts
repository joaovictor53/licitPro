import test from 'node:test'
import assert from 'node:assert/strict'
import { ajustarItemAItem, ajustarProporcional, menorCaminhoEmCentavos, REGRAS_PADRAO, sugerirRegrasNoTexto } from './readequacao-proposta'

const it = (id: string, ordem: number, quantidade: number, precoOfertado: number | null) => ({ id, ordem, quantidade, precoOfertado })
const liberada = { ...REGRAS_PADRAO, vedadoAumentarUnitario: false }

test('proporcional exato: total igual ao lance', () => {
  const r = ajustarProporcional([it('a', 1, 10, 10), it('b', 2, 5, 20)], 150)
  assert.deepEqual(r.novosPrecos, { a: 7.5, b: 15 })
  assert.equal(r.totalAnterior, 200)
  assert.equal(r.totalNovo, 150)
  assert.equal(r.bloqueada, false)
})

test('proporcional fecha os centavos mexendo em R$ 0,01 de um item', () => {
  const r = ajustarProporcional([it('a', 1, 1, 10), it('b', 2, 1, 10)], 15.01)
  assert.equal(r.totalNovo, 15.01)
  assert.equal(r.bloqueada, false)
  assert.equal(Object.values(r.novosPrecos).reduce((s, v) => s + v, 0).toFixed(2), '15.01')
})

test('não deixa preço virar zero nem negativo', () => {
  const r = ajustarProporcional([it('a', 1, 1, 10), it('b', 2, 1, 0.01)], 0.5)
  assert.ok(Object.values(r.novosPrecos).every((v) => v >= 0.01))
})

test('edital veda aumentar: lance acima do total é bloqueado com a página', () => {
  const regras = { ...REGRAS_PADRAO, pagina: 14 }
  const r = ajustarProporcional([it('a', 1, 10, 10)], 120, regras)
  assert.equal(r.bloqueada, true)
  assert.match(r.violacoes.join(' '), /veda aumentar o preço unitário na readequação \(edital, pág\. 14\)/)
})

test('sem a vedação, aumentar é permitido', () => {
  const r = ajustarProporcional([it('a', 1, 10, 10)], 120, liberada)
  assert.equal(r.bloqueada, false)
  assert.equal(r.totalNovo, 120)
})

test('lance inválido e sem itens com preço', () => {
  assert.equal(ajustarProporcional([it('a', 1, 10, 10)], 0).bloqueada, true)
  assert.equal(ajustarProporcional([it('a', 1, 10, null)], 50).bloqueada, true)
  assert.equal(ajustarProporcional([it('a', 1, 10, 10)], NaN).bloqueada, true)
})

test('quantidade fracionada que não fecha o lance: bloqueia em vez de chutar', () => {
  const r = ajustarProporcional([it('a', 1, 1.5, 10)], 7.77)
  // 1,5 × preço só fecha em passos de 1,5 centavo: se não fechar, tem de avisar
  if (r.totalNovo !== 7.77) {
    assert.equal(r.bloqueada, true)
    assert.match(r.violacoes.join(' '), /diferença de/)
  }
})

test('item a item: sem lance confere só a vedação; com lance exige o total', () => {
  const itens = [it('a', 1, 10, 10), it('b', 2, 5, 20)]
  assert.equal(ajustarItemAItem(itens, { a: 9 }).bloqueada, false)
  assert.equal(ajustarItemAItem(itens, { a: 11 }).bloqueada, true)
  assert.equal(ajustarItemAItem(itens, { a: 9, b: 18 }, REGRAS_PADRAO, 180).bloqueada, false) // 90 + 90
  const errado = ajustarItemAItem(itens, { a: 9, b: 19 }, REGRAS_PADRAO, 180)
  assert.equal(errado.bloqueada, true)
  assert.match(errado.violacoes.join(' '), /não é exatamente igual ao lance/)
})

test('item a item: preço inválido ou item desconhecido é recusado', () => {
  const r = ajustarItemAItem([it('a', 1, 10, 10)], { a: -1, zzz: 5 })
  assert.equal(r.bloqueada, true)
  assert.equal(r.violacoes.length, 2)
})

test('menor caminho em centavos', () => {
  assert.deepEqual(menorCaminhoEmCentavos(0, [1], [1]), [])
  assert.equal(menorCaminhoEmCentavos(-3, [], [3])?.length, 1)
  assert.equal(menorCaminhoEmCentavos(1, [], [3]), null)
})

test('sugere a regra de vedação no edital, com a página', () => {
  const r = sugerirRegrasNoTexto('[[PÁGINA 3]]\nObjeto.\n[[PÁGINA 14]]\n12.5. É vedado aumentar o preço unitário na proposta readequada.')
  assert.equal(r?.pagina, 14)
  assert.equal(r?.vedadoAumentarUnitario, true)
  assert.equal(sugerirRegrasNoTexto('[[PÁGINA 1]]\nO prazo é de 10 dias.'), null)
})
