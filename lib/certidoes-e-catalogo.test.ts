import test from 'node:test'
import assert from 'node:assert/strict'
import { classificarSituacaoCertidao, temRestricao, valeComoRegular } from './tipos-certidao'
import { inferirTemValidade, nomesSemelhantes, proporNovoTipo, textoCasaComPalavrasChave } from './catalogo-documentos'
import { calcularSituacaoChecklist, sugerirDocumentoParaExigencia } from './checklist-documental'

test('certidão: o título manda', () => {
  assert.equal(classificarSituacaoCertidao('CERTIDÃO NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS')?.situacao, 'negativa')
  assert.equal(classificarSituacaoCertidao('CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS')?.situacao, 'positiva_com_efeitos_de_negativa')
  assert.equal(classificarSituacaoCertidao('Certidão Positiva de Débitos Trabalhistas')?.situacao, 'positiva')
})

test('certidão: corpo que cita a outra situação não decide', () => {
  const texto = 'CERTIDÃO NEGATIVA DE DÉBITOS\n\nEsta certidão não se confunde com a certidão positiva de débitos.'
  assert.equal(classificarSituacaoCertidao(texto)?.situacao, 'negativa')
})

test('certidão: sem título reconhecível devolve null; regular x restrição', () => {
  assert.equal(classificarSituacaoCertidao('Comprovante de inscrição'), null)
  assert.equal(classificarSituacaoCertidao(null), null)
  assert.equal(valeComoRegular('negativa'), true)
  assert.equal(valeComoRegular('positiva_com_efeitos_de_negativa'), true)
  assert.equal(valeComoRegular('positiva'), false)
  assert.equal(temRestricao('positiva'), true)
})

test('checklist: certidão positiva (pelo nome) não confere; negativa e positiva com efeitos valem', () => {
  const base = { tipo: 'certidao_federal' as const, validadeEm: null, dadosBalanco: null }
  assert.equal(calcularSituacaoChecklist({ ...base, nome: 'Certidão positiva de débitos federais' }, null), 'nao_confere')
  assert.equal(calcularSituacaoChecklist({ ...base, nome: 'CND Federal' }, null), 'ok')
  assert.equal(calcularSituacaoChecklist({ ...base, nome: 'Certidão positiva com efeitos de negativa' }, null), 'ok')
  assert.equal(calcularSituacaoChecklist({ ...base }, null), 'ok') // chamadores antigos, sem nome
})

test('catálogo: propõe tipo novo com origem segura e conjunto de termos distintivos', () => {
  const t = proporNovoTipo('Certidão de regularidade no Conselho Regional de Engenharia e Agronomia', { trecho: 'certidão válida' })
  assert.ok(t)
  assert.equal(t.estado, 'novo_confirmar')
  assert.equal(t.temValidade, true)
  assert.ok(t.id.startsWith('novo_certidao_de_regularidade'))
  assert.ok(t.palavrasChave.some((p) => p.startsWith('{') && p.endsWith('}')))
})

test('catálogo: só vocabulário genérico de certidão não vira tipo novo', () => {
  assert.equal(proporNovoTipo('Certidão negativa de débitos relativos'), null)
  assert.equal(proporNovoTipo('Documento'), null)
  assert.equal(proporNovoTipo(''), null)
})

test('catálogo: nome com caractere de inversão de escrita é limpo', () => {
  const t = proporNovoTipo('Licença ‮ambiental de operação')
  assert.ok(t)
  assert.doesNotMatch(t.nome, /‮/)
})

test('catálogo: o conjunto casa o mesmo documento descrito com outras palavras', () => {
  const t = proporNovoTipo('Licença ambiental de operação da empresa')
  assert.ok(t)
  assert.equal(textoCasaComPalavrasChave('Apresentar licença ambiental de operação vigente', t.palavrasChave), true)
  assert.equal(textoCasaComPalavrasChave('Certidão negativa de débitos federais', t.palavrasChave), false)
})

test('catálogo: validade e semelhança', () => {
  assert.equal(inferirTemValidade('Alvará de funcionamento'), true)
  assert.equal(inferirTemValidade('Contrato social'), false)
  assert.equal(inferirTemValidade('Foto do prédio'), null)
  assert.equal(nomesSemelhantes('Certidão de regularidade no CREA', 'Certidão regularidade CREA'), true)
  assert.equal(nomesSemelhantes('Licença ambiental', 'Alvará sanitário'), false)
})

test('checklist: documento "outro" casa pelo nome; os fixos continuam na frente', () => {
  const docs = [
    { id: '1', tipo: 'outro' as const, nome: 'Licença ambiental de operação' },
    { id: '2', tipo: 'fgts' as const, nome: 'CRF FGTS' },
  ]
  assert.equal(sugerirDocumentoParaExigencia('Comprovar licença ambiental de operação vigente', docs)?.id, '1')
  assert.equal(sugerirDocumentoParaExigencia('Certificado de regularidade do FGTS', docs)?.id, '2')
  assert.equal(sugerirDocumentoParaExigencia('Certidão negativa municipal', docs), null)
})
