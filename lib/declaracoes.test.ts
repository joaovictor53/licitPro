import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dataPorExtenso, montarDeclaracaoPadrao, montarDeclaracaoPeloTrecho, montarProcuracao, preencherModelo, tipoDeDeclaracaoPorNome,
  type DadosEmpresaDeclaracao,
} from './declaracoes'
import { avaliarSignatario } from './poderes-signatario'
import { gerarPdfDeTexto } from './pdf-texto'
import { extrairTextoPdf } from './porteiro-proposta'

const empresa: DadosEmpresaDeclaracao = {
  razaoSocial: 'Empresa Teste Ltda', cnpj: '00.000.000/0001-00', endereco: 'Rua A, 1, Manaus/AM', porte: 'epp',
  representante: { nome: 'Fulana de Tal', cpf: '000.000.000-00' },
}
const data = new Date(2026, 9, 14)

test('data por extenso', () => {
  assert.equal(dataPorExtenso(data), '14 de outubro de 2026')
})

test('reconhece o tipo pelo título da exigência', () => {
  assert.equal(tipoDeDeclaracaoPorNome('Declaração de inexistência de fato superveniente impeditivo'), 'fato_impeditivo')
  assert.equal(tipoDeDeclaracaoPorNome('Declaração de que não emprega menor (art. 7º, XXXIII)'), 'menor_aprendiz')
  assert.equal(tipoDeDeclaracaoPorNome('Declaração de enquadramento como ME/EPP'), 'me_epp')
  assert.equal(tipoDeDeclaracaoPorNome('Declaração única de habilitação'), 'diversas_habilitacao')
  assert.equal(tipoDeDeclaracaoPorNome('Declaração de visita técnica'), null)
})

test('declaração padrão sai preenchida, sem marcador', () => {
  const r = montarDeclaracaoPadrao('fato_impeditivo', empresa, 'Manaus', data)
  assert.ok(r.ok)
  if (!r.ok) return
  assert.match(r.declaracao.texto, /Empresa Teste Ltda, inscrita no CNPJ sob o nº 00\.000\.000\/0001-00/)
  assert.match(r.declaracao.texto, /Manaus, 14 de outubro de 2026\./)
  assert.doesNotMatch(r.declaracao.texto, /\{\{|\}\}/)
})

test('faltou dado: não gera e diz o que informar', () => {
  const r = montarDeclaracaoPadrao('fato_impeditivo', { ...empresa, representante: { nome: 'Fulana' } }, 'Manaus', data)
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.erro, /CPF do representante legal/)
  const semCidade = montarDeclaracaoPadrao('fato_impeditivo', empresa, '  ', data)
  assert.equal(semCidade.ok, false)
})

test('ME/EPP só com porte ME ou EPP no cadastro', () => {
  assert.equal(montarDeclaracaoPadrao('me_epp', { ...empresa, porte: 'demais' }, 'Manaus', data).ok, false)
  assert.equal(montarDeclaracaoPadrao('me_epp', { ...empresa, porte: null }, 'Manaus', data).ok, false)
  assert.equal(montarDeclaracaoPadrao('me_epp', { ...empresa, porte: 'me' }, 'Manaus', data).ok, true)
})

test('declaração pelo trecho cita o edital e não trata {{...}} do trecho como campo', () => {
  const r = montarDeclaracaoPeloTrecho(
    { titulo: 'Declaração de visita', trecho: 'declarar que visitou o local {{X}} e $& tem ciência', pagina: 12, clausula: '9.4' },
    empresa, 'Manaus', data
  )
  assert.ok(r.ok)
  if (!r.ok) return
  assert.match(r.declaracao.texto, /\(item 9\.4, pág\. 12\)/)
  assert.match(r.declaracao.texto, /"declarar que visitou o local \{\{X\}\} e \$& tem ciência"/)
  assert.match(r.declaracao.rodape, /confira antes de assinar/)
})

test('preencherModelo lista campos faltando', () => {
  const r = preencherModelo('{{A}} e {{B}} e {{A}}', { A: 'x' })
  assert.deepEqual(r.faltando, ['B'])
})

test('quem assina: sócio, procuração, retirante, faltam dados', () => {
  const rep = { nome: 'Fulana', cpf: '000.000.000-00' }
  assert.equal(avaliarSignatario({ ...rep, poderes: 'Sócia-administradora' }).situacao, 'socio_administrador')
  assert.equal(avaliarSignatario({ ...rep, poderes: 'Procurador, conforme procuração' }).situacao, 'precisa_procuracao')
  assert.equal(avaliarSignatario({ ...rep, poderes: 'Administrador financeiro' }).situacao, 'precisa_procuracao')
  assert.equal(avaliarSignatario({ ...rep, poderes: 'Ex-sócio retirante' }).situacao, 'nao_pode_assinar')
  assert.equal(avaliarSignatario({ nome: 'Fulana', poderes: 'Sócia' }).situacao, 'faltam_dados')
  assert.equal(avaliarSignatario(null).situacao, 'sem_representante')
})

test('procuração: gera com outorgante e procurador; sem dado, recusa', () => {
  const dados = {
    empresa, objeto: 'Aquisição de materiais', outorgante: { nome: 'Sócio Um', cpf: '111.111.111-11', cargo: 'Sócio-administrador' },
    outorgado: { nome: 'Fulana de Tal', cpf: '000.000.000-00', cargo: 'Procuradora' },
  }
  const r = montarProcuracao(dados, 'Manaus', data)
  assert.ok(r.ok)
  if (r.ok) assert.match(r.declaracao.texto, /validade de 12 \(doze\) meses/)
  assert.equal(montarProcuracao({ ...dados, objeto: '' }, 'Manaus', data).ok, false)
})

test('PDF da declaração tem o texto e o rodapé de conferência', async () => {
  const r = montarDeclaracaoPadrao('diversas_habilitacao', empresa, 'Manaus', data)
  assert.ok(r.ok)
  if (!r.ok) return
  const pdf = await gerarPdfDeTexto(r.declaracao.texto, { rodape: r.declaracao.rodape })
  const texto = await extrairTextoPdf(pdf)
  assert.match(texto, /DECLARAÇÃO ÚNICA PARA FINS DE HABILITAÇÃO/)
  assert.match(texto, /Empresa Teste Ltda/)
  assert.match(texto, /confira antes de assinar/)
  assert.doesNotMatch(texto, /\{\{/)
})
