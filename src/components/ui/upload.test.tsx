// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { Upload } from './upload'
import type { ReactNode } from 'react'
import { MotionProvider } from '@/lib/motion'
import { settleLayout } from '@/test/motion'

// jsdom não sabe gerar um blob: real a partir do File do Node/Vitest; o componente só
// precisa de uma string para a miniatura, então os testes substituem as duas funções.
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

/** Ordem visível dos nomes de arquivo na tela (na ordem em que aparecem no DOM). */
function visibleFileNames() {
  return [...screen.getAllByText(/\.pdf$/)].map((el) => el.textContent)
}

describe('Upload', () => {
  it('recusa arquivo acima do limite e aceita o resto', async () => {
    const onChange = vi.fn()
    const { container } = renderApp(<Upload maxSizeMb={1} onChange={onChange} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const small = new File(['a'], 'contrato.pdf', { type: 'application/pdf' })
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'video.mp4', { type: 'video/mp4' })
    fireEvent.change(input, { target: { files: [small, big] } })
    expect(await screen.findByText('contrato.pdf')).toBeInTheDocument()
    expect(screen.getByText('Arquivo maior que 1 MB.')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()
    expect(container.querySelector('[data-rendra="UPL-001"]')).toBeInTheDocument()
  })

  it('layout gallery: mostra a miniatura, o progresso durante o envio e o sucesso ao terminar', async () => {
    let resolveUpload: () => void = () => {}
    const onUpload = vi.fn(
      (_file: File, onProgress: (pct: number) => void) =>
        new Promise<void>((resolve) => {
          onProgress(40)
          resolveUpload = resolve
        }),
    )
    const { container } = renderApp(<Upload layout="gallery" onUpload={onUpload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const image = new File(['a'], 'foto.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [image] } })

    expect(await screen.findByText('foto.png')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="UPL-002"]')).toBeInTheDocument()
    expect(container.querySelector('img[src="blob:mock"]')).toBeInTheDocument()
    // Progresso visível: barra com role="progressbar" e o valor no aria-valuenow.
    const bar = screen.getByRole('progressbar', { name: 'Enviando foto.png' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(screen.queryByRole('img', { name: 'Enviado' })).not.toBeInTheDocument()

    resolveUpload()
    expect(await screen.findByRole('img', { name: 'Enviado' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('maxItems esconde a área de soltar arquivo ao chegar no limite', async () => {
    const { container } = renderApp(<Upload maxItems={1} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'um.pdf', { type: 'application/pdf' })] },
    })
    await screen.findByText('um.pdf')
    expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument()
  })

  it('remover chama onRemove, o arquivo some da tela e a miniatura é revogada', async () => {
    const onRemove = vi.fn()
    const { container } = renderApp(<Upload onRemove={onRemove} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'foto.png', { type: 'image/png' })] },
    })
    await screen.findByText('foto.png')
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto.png' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('foto.png')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('multiple=false: escolher outro arquivo substitui o anterior e revoga a miniatura dele', async () => {
    const { container } = renderApp(<Upload multiple={false} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'um.png', { type: 'image/png' })] },
    })
    await screen.findByText('um.png')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    fireEvent.change(input, {
      target: { files: [new File(['b'], 'dois.png', { type: 'image/png' })] },
    })
    await screen.findByText('dois.png')
    expect(screen.queryByText('um.png')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('tentar de novo chama onRetry e, ao terminar, o sucesso fica visível (não repete o erro)', async () => {
    const onRetry = vi.fn()
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Servidor recusou.'))
      .mockResolvedValueOnce(undefined)
    const { container } = renderApp(<Upload onUpload={onUpload} onRetry={onRetry} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'doc.pdf', { type: 'application/pdf' })] },
    })
    expect(await screen.findByText('Servidor recusou.')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: 'Tentar enviar doc.pdf de novo' })
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('img', { name: 'Enviado' })).toBeInTheDocument()
    expect(screen.queryByText('Servidor recusou.')).not.toBeInTheDocument()
  })

  it('onReorder: a alça aparece só com onReorder e a seta ↓ troca a ordem visível dos arquivos', async () => {
    const onReorder = vi.fn()
    const { container } = renderApp(<Upload onReorder={onReorder} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File(['a'], 'a.pdf', { type: 'application/pdf' }),
          new File(['b'], 'b.pdf', { type: 'application/pdf' }),
        ],
      },
    })
    await screen.findByText('a.pdf')
    expect(visibleFileNames()).toEqual(['a.pdf', 'b.pdf'])
    const handle = screen.getByRole('button', { name: 'Reordenar a.pdf' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(visibleFileNames()).toEqual(['b.pdf', 'a.pdf'])
    expect(onReorder).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]))
  })

  it('sem onReorder, a alça de arraste não aparece', async () => {
    const { container } = renderApp(<Upload />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'doc.pdf', { type: 'application/pdf' })] },
    })
    await screen.findByText('doc.pdf')
    expect(screen.queryByRole('button', { name: 'Reordenar doc.pdf' })).not.toBeInTheDocument()
  })

  it('com crop, a imagem só vira item visível da lista depois de confirmada no recorte', async () => {
    const original = HTMLCanvasElement.prototype.getContext
    // @ts-expect-error simula só o que o componente usa do CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = () => ({ drawImage: () => {} })
    HTMLCanvasElement.prototype.toBlob = function (cb, type) {
      cb(new Blob(['x'], { type: type ?? 'image/png' }))
    }
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 200 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 200 })

    const { container } = renderApp(
      <Upload crop={{ aspects: [{ id: 'quadrado', label: 'Quadrado', ratio: 1 }] }} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const image = new File(['a'], 'foto.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [image] } })

    // O recorte aparece antes do item entrar na lista; nada de "foto.png" na tela ainda.
    expect(container.querySelector('[data-rendra="CROP-001"]')).toBeInTheDocument()
    expect(screen.queryByText('foto.png')).not.toBeInTheDocument()

    const img = container.querySelector('[data-rendra="CROP-001"] img')!
    Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true })
    fireEvent.load(img)
    fireEvent.click(await screen.findByRole('button', { name: 'Recortar' }))

    expect(await screen.findByText('foto.png')).toBeInTheDocument()
    expect(container.querySelector('[data-rendra="CROP-001"]')).not.toBeInTheDocument()
    HTMLCanvasElement.prototype.getContext = original
  })

  it('com crop e multiple=false, confirmar o segundo recorte substitui o primeiro e revoga a miniatura dele', async () => {
    const original = HTMLCanvasElement.prototype.getContext
    // @ts-expect-error simula só o que o componente usa do CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = () => ({ drawImage: () => {} })
    HTMLCanvasElement.prototype.toBlob = function (cb, type) {
      cb(new Blob(['x'], { type: type ?? 'image/png' }))
    }
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 200 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 200 })

    const crop = async (container: HTMLElement, name: string) => {
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, {
        target: { files: [new File(['a'], name, { type: 'image/png' })] },
      })
      const img = container.querySelector('[data-rendra="CROP-001"] img')!
      Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true })
      Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true })
      fireEvent.load(img)
      fireEvent.click(await screen.findByRole('button', { name: 'Recortar' }))
      await screen.findByText(name)
    }

    const { container } = renderApp(
      <Upload
        multiple={false}
        crop={{ aspects: [{ id: 'quadrado', label: 'Quadrado', ratio: 1 }] }}
      />,
    )
    await crop(container, 'um.png')
    // O próprio ImageCropper revoga a URL dele ao desmontar: guarda a contagem antes do
    // segundo recorte para isolar só a revogação do item substituído.
    const revokesBefore = vi.mocked(URL.revokeObjectURL).mock.calls.length

    await crop(container, 'dois.png')
    expect(screen.queryByText('um.png')).not.toBeInTheDocument()
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.length).toBeGreaterThan(revokesBefore)
    HTMLCanvasElement.prototype.getContext = original
  })
})

describe('Upload com motion', () => {
  const emOn = async (ui: ReactNode) => {
    const r = renderApp(<MotionProvider mode="on">{ui}</MotionProvider>)
    await settleLayout()
    return r
  }
  const pdf = (name: string) => new File(['x'], name, { type: 'application/pdf' })

  it.each(['list', 'gallery'] as const)(
    'em on (%s): adicionar mostra exatamente os arquivos e remover tira o item do DOM',
    async (layout) => {
      const { container } = await emOn(<Upload layout={layout} />)
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [pdf('a.pdf'), pdf('b.pdf')] } })
      expect(await screen.findByText('a.pdf')).toBeInTheDocument()
      expect(screen.getByText('b.pdf')).toBeInTheDocument()
      // a entrada anima: o item termina com opacidade 1 (em off ele nem tem estilo)
      const item = screen.getByText('a.pdf').closest('li')!
      await waitFor(() => expect(item.style.opacity).toBe('1'))
      fireEvent.click(screen.getByRole('button', { name: 'Remover a.pdf' }))
      await waitFor(() => expect(screen.queryByText('a.pdf')).not.toBeInTheDocument())
      expect(screen.getByText('b.pdf')).toBeInTheDocument()
    },
  )

  it('em on, o progresso por item e o ícone de sucesso seguem funcionando', async () => {
    let resolveUpload: () => void = () => {}
    const onUpload = vi.fn(
      (_file: File, onProgress: (pct: number) => void) =>
        new Promise<void>((resolve) => {
          onProgress(40)
          resolveUpload = resolve
        }),
    )
    const { container } = await emOn(<Upload layout="gallery" onUpload={onUpload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'foto.png', { type: 'image/png' })] },
    })
    const bar = await screen.findByRole('progressbar', { name: 'Enviando foto.png' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    resolveUpload()
    expect(await screen.findByRole('img', { name: 'Enviado' })).toBeInTheDocument()
  })

  it('em on, reordenar pelo teclado troca a ordem visível e avisa onReorder', async () => {
    const onReorder = vi.fn()
    const { container } = await emOn(<Upload onReorder={onReorder} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [pdf('a.pdf'), pdf('b.pdf')] } })
    await screen.findByText('a.pdf')
    expect(visibleFileNames()).toEqual(['a.pdf', 'b.pdf'])
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar a.pdf' }), {
      key: 'ArrowDown',
    })
    expect(visibleFileNames()).toEqual(['b.pdf', 'a.pdf'])
    expect(onReorder).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]))
  })
})
