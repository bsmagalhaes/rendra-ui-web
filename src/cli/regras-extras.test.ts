/*
 * Regras extras de `rendra auditar --all` e do `check:rules` (as dez que vão além das sete
 * genéricas de auditar.ts). Puras, com strings. Os gatilhos de `variavel-sem-prefixo-rendra`
 * são montados por concatenação, porque o `check:rules` varre estes arquivos e acusaria o
 * literal.
 */
import { describe, expect, it } from 'vitest'
import {
  IDS_REGRAS_EXTRAS,
  componenteDuplicado,
  cssForaDoLugar,
  botaoSolto,
  regrasPorLinha,
  textoOrientativo,
  variavelSemPrefixo,
} from './regras-extras.ts'

const ids = (text: string) => regrasPorLinha(text).map((v) => v.rule)
const VAR = 'var(--'

describe('regrasPorLinha', () => {
  it('var-inline acusa variável do namespace do Tailwind em JS', () => {
    const [v] = regrasPorLinha(`const a = '${VAR}color-primary)'`)
    expect(v).toMatchObject({ rule: 'var-inline', line: 1 })
    expect(v!.message).toContain('Variáveis --color-*')
    expect(v!.source).toBe(`const a = '${VAR}color-primary)'`)
    expect(ids(`const a = '${VAR}rendra-primary)'`)).not.toContain('var-inline')
  })

  it('svg-marca acusa import de brand/assets', () => {
    expect(ids("import logo from '../brand/assets/logo.svg'")).toEqual(['svg-marca'])
    expect(ids("import logo from '../brand/index.ts'")).toEqual([])
  })

  it('classe-dinamica acusa classe por template string e pula comentário', () => {
    expect(ids('<div className={`p-${n}`} />')).toEqual(['classe-dinamica'])
    expect(ids('// p-${n}')).toEqual([])
    expect(ids('<div className="p-4" />')).toEqual([])
  })

  it('texto-estreito acusa max-w em parágrafo', () => {
    expect(ids('<p className="max-w-md">x</p>')).toEqual(['texto-estreito'])
    expect(ids('<div className="max-w-md">x</div>')).toEqual([])
  })

  it('primaria-como-texto acusa text-primary, não text-primary-text', () => {
    expect(ids('<p className="text-primary">x</p>')).toEqual(['primaria-como-texto'])
    expect(ids('<p className="text-primary-text">x</p>')).toEqual([])
  })

  it('numera as linhas e intercala as regras linha a linha', () => {
    const texto = ['ok', '<p className="max-w-md text-primary">x</p>', "from 'a/brand/assets/b'"]
    const achados = regrasPorLinha(texto.join('\n'))
    expect(achados.map((v) => `${v.line}:${v.rule}`)).toEqual([
      '2:texto-estreito',
      '2:primaria-como-texto',
      '3:svg-marca',
    ])
  })

  it('a regra com flag g não carrega estado entre chamadas', () => {
    const texto = '<p className="text-primary">x</p>'
    expect(ids(texto)).toEqual(['primaria-como-texto'])
    expect(ids(texto)).toEqual(['primaria-como-texto'])
  })
})

describe('componenteDuplicado', () => {
  it.each([
    'src/ui/CardMobile.tsx',
    'src/ui/SelectSimples.tsx',
    'src/ui/card-mobile.tsx',
    'src/ui/tabela-com-busca.ts',
    'src/ui/BotaoGrande.jsx',
  ])('acusa %s pelo nome, linha 0', (caminho) => {
    expect(componenteDuplicado(caminho)).toMatchObject({
      rule: 'componente-duplicado',
      line: 0,
      source: '',
    })
  })

  it.each(['src/ui/Card.tsx', 'src/mobile/Card.tsx', 'src/ui/card.css'])(
    'não acusa %s',
    (caminho) => {
      expect(componenteDuplicado(caminho)).toBeUndefined()
    },
  )

  it('a mensagem manda resolver com props', () => {
    expect(componenteDuplicado('a/FooMobile.ts')!.message).toBe(
      'Arquivo de variante paralela ou mobile. Resolva com props no componente único.',
    )
  })
})

describe('cssForaDoLugar', () => {
  it('devolve a violação de linha 0', () => {
    expect(cssForaDoLugar()).toMatchObject({ rule: 'css-fora-do-lugar', line: 0, source: '' })
  })
})

describe('botaoSolto', () => {
  it('acusa botão direto no CardContent, com a linha do início da ocorrência', () => {
    const texto = ['<Card>', '  <CardContent>', '    <Button>Salvar</Button>', '  </CardContent>']
    const [v] = botaoSolto(texto.join('\n'))
    expect(v).toMatchObject({ rule: 'botao-solto', line: 2, source: '<CardContent>' })
  })

  it('acusa botão com self-start e não acusa botão em CardHeader', () => {
    expect(botaoSolto('<Button className="self-end">x</Button>')).toHaveLength(1)
    expect(botaoSolto('<CardHeader actions={<Button>x</Button>} />')).toHaveLength(0)
  })

  it('acusa também com Stack no meio', () => {
    expect(botaoSolto('<CardContent><Stack gap="2"><Button>x</Button></Stack>')).toHaveLength(1)
  })
})

describe('textoOrientativo', () => {
  it('converte id/src da regra de texto para rule/source', () => {
    const [v] = textoOrientativo('<PageHeader description="Comece escolhendo." />')
    expect(v).toMatchObject({ rule: 'texto-orientativo', line: 1 })
    expect(v!.source).toBe('description="Comece')
    expect(v!.message).toContain('Instrução no subtítulo')
  })

  it('texto curto e descritivo não acusa', () => {
    expect(textoOrientativo('<PageHeader description="Clientes da carteira." />')).toEqual([])
  })
})

describe('variavelSemPrefixo', () => {
  it('converte src para source e usa o identificador da regra', () => {
    const [v] = variavelSemPrefixo(`x { color: ${VAR}primary); }`)
    expect(v).toMatchObject({ rule: 'variavel-sem-prefixo-rendra', line: 1 })
    expect(v!.source).toBe(`x { color: ${VAR}primary); }`)
    expect(v!.message).toContain('--rendra-primary')
  })

  it('variável com prefixo não acusa', () => {
    expect(variavelSemPrefixo(`x { color: ${VAR}rendra-primary); }`)).toEqual([])
  })
})

describe('IDS_REGRAS_EXTRAS', () => {
  it('lista os dez identificadores sem repetição', () => {
    expect(IDS_REGRAS_EXTRAS).toHaveLength(10)
    expect(new Set(IDS_REGRAS_EXTRAS).size).toBe(10)
  })
})
