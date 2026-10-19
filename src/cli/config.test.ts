import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { IDS_TODAS_AS_REGRAS } from './auditar-tudo.ts'
import { CHAVES_CONFIG, NOME_ARQUIVO_CONFIG, carregarConfig } from './config.ts'

const temporarios: string[] = []

function pastaCom(conteudo?: string): string {
  const pasta = mkdtempSync(join(tmpdir(), 'rendra-config-'))
  temporarios.push(pasta)
  if (conteudo !== undefined) writeFileSync(join(pasta, NOME_ARQUIVO_CONFIG), conteudo)
  return pasta
}

afterAll(() => {
  for (const t of temporarios) rmSync(t, { recursive: true, force: true })
})

describe('carregarConfig', () => {
  it('arquivo ausente devolve config vazia', () => {
    expect(carregarConfig(pastaCom())).toEqual({ config: {} })
  })

  it('config completa é devolvida como está', () => {
    const completa = {
      pastas: ['src', 'extra'],
      ignorar: ['src/gerado'],
      regras: { 'botao-solto': false, 'cor-fixa': true },
      pastasMarca: ['src/tema'],
      pastasTelas: ['src/telas'],
    }
    expect(carregarConfig(pastaCom(JSON.stringify(completa)))).toEqual({ config: completa })
  })

  it('aceita BOM no início do arquivo e objeto vazio', () => {
    expect(carregarConfig(pastaCom('﻿{}'))).toEqual({ config: {} })
  })

  it('lista as chaves aceitas', () => {
    expect([...CHAVES_CONFIG]).toEqual([
      'pastas',
      'ignorar',
      'regras',
      'pastasMarca',
      'pastasTelas',
    ])
  })

  it('JSON inválido: erro em português que cita o arquivo', () => {
    const r = carregarConfig(pastaCom('{ pastas: '))
    expect(r).toHaveProperty('erro')
    const erro = (r as { erro: string }).erro
    expect(erro).toContain(NOME_ARQUIVO_CONFIG)
    expect(erro).toContain('JSON inválido')
  })

  it('arquivo vazio também é JSON inválido', () => {
    expect((carregarConfig(pastaCom('')) as { erro: string }).erro).toContain('JSON inválido')
  })

  it('o conteúdo precisa ser um objeto', () => {
    for (const texto of ['[]', 'null', '"x"', '3']) {
      const erro = (carregarConfig(pastaCom(texto)) as { erro: string }).erro
      expect(erro).toContain('precisa ser um objeto')
    }
  })

  it('chave desconhecida: cita a chave e as aceitas', () => {
    const erro = (carregarConfig(pastaCom('{"ignore":["a"]}')) as { erro: string }).erro
    expect(erro).toContain('chave desconhecida "ignore"')
    for (const chave of CHAVES_CONFIG) expect(erro).toContain(chave)
  })

  it.each(['pastas', 'ignorar', 'pastasMarca', 'pastasTelas'])(
    '%s precisa ser uma lista de textos',
    (chave) => {
      for (const valor of ['"src"', '[1]', '[["a"]]', '{}']) {
        const erro = (carregarConfig(pastaCom(`{"${chave}":${valor}}`)) as { erro: string }).erro
        expect(erro).toContain(`"${chave}" precisa ser uma lista de textos`)
      }
    },
  )

  it('regras precisa ser um objeto de true ou false', () => {
    const naoObjeto = (carregarConfig(pastaCom('{"regras":["cor-fixa"]}')) as { erro: string }).erro
    expect(naoObjeto).toContain('"regras" precisa ser um objeto')
    const naoBooleano = (
      carregarConfig(pastaCom('{"regras":{"cor-fixa":"não"}}')) as {
        erro: string
      }
    ).erro
    expect(naoBooleano).toContain('"regras.cor-fixa" precisa ser true ou false')
  })

  it('id de regra desconhecido: cita o id e lista os 17 válidos', () => {
    const erro = (carregarConfig(pastaCom('{"regras":{"nao-existe":false}}')) as { erro: string })
      .erro
    expect(erro).toContain('regra desconhecida "nao-existe"')
    for (const id of IDS_TODAS_AS_REGRAS) expect(erro).toContain(id)
  })

  it('arquivo que não dá para ler (é uma pasta) vira erro, não exceção', () => {
    const pasta = pastaCom()
    mkdirSync(join(pasta, NOME_ARQUIVO_CONFIG))
    const erro = (carregarConfig(pasta) as { erro: string }).erro
    expect(erro).toContain(NOME_ARQUIVO_CONFIG)
    expect(erro).toContain('não consegui ler')
  })
})
