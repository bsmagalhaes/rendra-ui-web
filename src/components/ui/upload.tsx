import { FileText, ImageIcon, RotateCw, Trash2, UploadCloud, VideoIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ElementType,
  type ReactNode,
} from 'react'
import { resolveCatalogCode } from '@/catalog/components'
import { BrandFeedbackIcon } from '@/components/ui/brand-feedback-icon'
import { Button } from '@/components/ui/button'
import { ImageCropper, type ImageCropperAspect } from '@/components/ui/image-cropper'
import { Progress } from '@/components/ui/progress'
import { SortableHandle } from '@/components/ui/sortable-handle'
import { cn } from '@/lib/cn'
import { layoutEnabled, useLayoutReady, useMotionMode, useMotionPresets } from '@/lib/motion'
import { useSortable } from '@/lib/sortable'

export interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
  /** URL local (miniatura) para imagem ou vídeo; revogada ao remover ou desmontar. */
  previewUrl?: string
  /** Espelha progress (0-100), lido pelo layout "gallery". */
  progressPercent?: number
  /** Espelha error, lido pelo layout "gallery". */
  errorMessage?: string
  kind?: 'image' | 'video' | 'other'
}

export interface UploadProps {
  /** Tipos aceitos, como no input file (ex.: "image/*,.pdf"). */
  accept?: string
  multiple?: boolean
  /** Tamanho máximo por arquivo, em MB. */
  maxSizeMb?: number
  /** Envia o arquivo; chame onProgress(0..100). Rejeite a promessa em caso de erro. */
  onUpload?: (file: File, onProgress: (pct: number) => void) => Promise<void>
  onChange?: (items: UploadItem[]) => void
  hint?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  /** Lista (padrão) ou galeria com miniaturas. */
  layout?: 'list' | 'gallery'
  /** Total de arquivos permitido; passando dele, a área de soltar arquivo some. */
  maxItems?: number
  /** Além da remoção interna, avisa quem usa o Upload (ex.: para apagar no servidor). */
  onRemove?: (id: string) => void
  /** Além da tentativa interna, avisa quem usa o Upload que o arquivo tentou de novo. */
  onRetry?: (id: string) => void
  /** Reordena os arquivos (motor de src/lib/sortable.ts, o mesmo da List e do Kanban). */
  onReorder?: (ids: string[]) => void
  /**
   * Com ela, toda imagem passa pelo recorte antes de virar arquivo enviado: o arquivo só é
   * entregue (a onUpload e a onChange) depois de confirmado no recorte.
   */
  crop?: { aspects: ImageCropperAspect[]; maxOutputWidth?: number }
  'aria-describedby'?: string
}

const formatSize = (b: number) =>
  b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} KB`
    : `${(b / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`

function kindOf(file: File): NonNullable<UploadItem['kind']> {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

/** Upload único: arrastar e soltar ou tocar para escolher, em lista ou em galeria. */
export function Upload({
  accept,
  multiple = true,
  maxSizeMb = 10,
  onUpload,
  onChange,
  hint,
  disabled,
  invalid,
  id,
  layout = 'list',
  maxItems,
  onRemove,
  onRetry,
  onReorder,
  crop,
  ...aria
}: UploadProps) {
  const auto = useId()
  const inputId = id ?? `upload${auto}`
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [pendingCrop, setPendingCrop] = useState<File[]>([])
  const code = resolveCatalogCode('Upload', { layout })

  const itemsRef = useRef<UploadItem[]>([])
  itemsRef.current = items
  useEffect(
    () => () => {
      // Revoga toda miniatura ao desmontar: object URL nunca sobrevive à tela.
      itemsRef.current.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl))
    },
    [],
  )

  const update = (fn: (all: UploadItem[]) => UploadItem[]) =>
    setItems((all) => {
      const next = fn(all)
      onChange?.(next)
      return next
    })

  const patch = (id: string, changes: Partial<UploadItem>) =>
    update((all) =>
      all.map((i) => {
        if (i.id !== id) return i
        const merged = { ...i, ...changes }
        if ('progress' in changes) merged.progressPercent = merged.progress
        if ('error' in changes) merged.errorMessage = merged.error
        return merged
      }),
    )

  /**
   * Acrescenta os itens novos (multiple) ou substitui o que já existia (multiple=false),
   * revogando a miniatura do que sai: o object URL nunca fica pendurado sem tela nenhuma
   * usando ele.
   */
  const insertItems = (created: UploadItem[]) =>
    update((all) => {
      if (multiple) return [...all, ...created]
      all.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl))
      return created
    })

  const send = (item: UploadItem) => {
    if (!onUpload) {
      patch(item.id, { progress: 100, status: 'done' })
      return
    }
    onUpload(item.file, (pct) => patch(item.id, { progress: pct }))
      .then(() => patch(item.id, { progress: 100, status: 'done' }))
      .catch((e: unknown) =>
        patch(item.id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Falha no envio.',
        }),
      )
  }

  const createItem = (file: File): UploadItem => {
    const tooBig = file.size > maxSizeMb * 1024 * 1024
    const kind = kindOf(file)
    return {
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      progress: 0,
      progressPercent: 0,
      status: tooBig ? 'error' : 'uploading',
      error: tooBig ? `Arquivo maior que ${maxSizeMb} MB.` : undefined,
      errorMessage: tooBig ? `Arquivo maior que ${maxSizeMb} MB.` : undefined,
      previewUrl: kind !== 'other' ? URL.createObjectURL(file) : undefined,
      kind,
    }
  }

  const acceptFiles = (files: File[]) => {
    const room = maxItems ? Math.max(0, maxItems - items.length - pendingCrop.length) : undefined
    const limited = room !== undefined ? files.slice(0, room) : files
    if (limited.length === 0) return
    if (crop) {
      const toCrop = limited.filter((f) => kindOf(f) === 'image')
      const rest = limited.filter((f) => kindOf(f) !== 'image')
      if (toCrop.length > 0) setPendingCrop((q) => [...q, ...toCrop])
      if (rest.length > 0) {
        const created = rest.map(createItem)
        insertItems(created)
        created.filter((c) => c.status === 'uploading').forEach(send)
      }
      return
    }
    const created = limited.map(createItem)
    insertItems(created)
    created.filter((c) => c.status === 'uploading').forEach(send)
  }

  const add = (files: FileList | null) => {
    if (!files) return
    acceptFiles(Array.from(files).slice(0, multiple ? undefined : 1))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (!disabled) add(e.dataTransfer.files)
  }

  const remove = (removeId: string) => {
    update((all) => {
      const removed = all.find((i) => i.id === removeId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return all.filter((i) => i.id !== removeId)
    })
    onRemove?.(removeId)
  }

  const retry = (it: UploadItem) => {
    patch(it.id, { status: 'uploading', progress: 0, error: undefined })
    send({ ...it, status: 'uploading', progress: 0 })
    onRetry?.(it.id)
  }

  const sortable = useSortable<UploadItem>({
    items: items.map((it) => ({ id: it.id, data: it })),
    onReorder: (sorted) => {
      update(() => sorted.map((s) => s.data))
      onReorder?.(sorted.map((s) => s.id))
    },
  })
  const motion = useMotionMode()
  const ready = useLayoutReady()
  const presets = useMotionPresets()
  // Em `on` cada item entra e sai animado (a saída segura o item até terminar) e reordena com
  // layout, pela mesma regra da List: sem layout durante o arraste.
  const Item: ElementType = motion === 'on' ? m.li : 'li'
  const itemMotion =
    motion === 'on'
      ? {
          ...presets.fade,
          layout: layoutEnabled({ mode: motion, ready, dragging: sortable.draggingId !== null }),
          transition: { ...presets.fade.transition, layout: presets.move },
        }
      : {}
  const animated = (nodes: ReactNode) =>
    motion === 'on' ? (
      <AnimatePresence mode="popLayout" initial={false}>
        {nodes}
      </AnimatePresence>
    ) : (
      nodes
    )

  const reachedLimit = maxItems !== undefined && items.length + pendingCrop.length >= maxItems

  const dropzone = !reachedLimit && (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-control border-2 border-dashed border-input bg-card px-4 py-8 text-center transition-colors',
        'hover:border-primary hover:bg-primary-soft/40 has-[:focus-visible]:focus-ring',
        drag && 'border-primary bg-primary-soft',
        invalid && 'border-destructive',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <UploadCloud className="size-icon-lg" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          <span className="text-primary-text">Toque para escolher</span>
          <span className="hidden md:inline"> ou arraste arquivos até aqui</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {hint ?? `Até ${maxSizeMb} MB por arquivo.`}
        </span>
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-describedby={aria['aria-describedby']}
        className="sr-only"
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ''
        }}
      />
    </label>
  )

  const handle = (it: UploadItem) =>
    onReorder && (
      <SortableHandle id={it.id} label={`Reordenar ${it.file.name}`} sortable={sortable} />
    )

  const listView = items.length > 0 && (
    <ul
      key={String(ready)}
      className="flex flex-col divide-y rounded-control border bg-card"
      aria-live="polite"
    >
      {animated(
        items.map((it) => (
          <Item
            key={it.id}
            {...(onReorder ? sortable.itemProps(it.id) : {})}
            {...itemMotion}
            className={cn(
              'flex items-center gap-3 p-3',
              sortable.draggingId === it.id && 'opacity-50',
            )}
          >
            {handle(it)}
            <span className="flex size-control-sm shrink-0 items-center justify-center rounded-item bg-muted text-muted-foreground md:size-control-md">
              {it.kind === 'image' ? (
                <ImageIcon className="size-icon-md" aria-hidden />
              ) : it.kind === 'video' ? (
                <VideoIcon className="size-icon-md" aria-hidden />
              ) : (
                <FileText className="size-icon-md" aria-hidden />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{it.file.name}</span>
                {it.status === 'done' && (
                  <BrandFeedbackIcon type="success" size="sm" animated label="Enviado" />
                )}
                {it.status === 'error' && <BrandFeedbackIcon type="error" size="sm" label="Erro" />}
              </div>
              {it.status === 'error' ? (
                <span className="text-xs font-medium text-destructive">{it.error}</span>
              ) : it.status === 'uploading' ? (
                <Progress
                  value={it.progress}
                  size="sm"
                  showValue
                  label={`Enviando ${it.file.name}`}
                />
              ) : (
                <span className="text-xs text-muted-foreground">{formatSize(it.file.size)}</span>
              )}
            </div>
            {it.status === 'error' && !it.error?.startsWith('Arquivo maior') && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Tentar enviar ${it.file.name} de novo`}
                onClick={() => retry(it)}
              >
                <RotateCw />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Remover ${it.file.name}`}
              onClick={() => remove(it.id)}
            >
              <Trash2 />
            </Button>
          </Item>
        )),
      )}
    </ul>
  )

  const galleryView = items.length > 0 && (
    <ul key={String(ready)} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {animated(
        items.map((it) => (
          <Item
            key={it.id}
            {...(onReorder ? sortable.itemProps(it.id) : {})}
            {...itemMotion}
            className={cn(
              'relative flex aspect-square flex-col overflow-hidden rounded-control border bg-card',
              sortable.draggingId === it.id && 'opacity-50',
            )}
          >
            {it.previewUrl && it.kind === 'image' ? (
              <img
                src={it.previewUrl}
                alt=""
                className="size-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="flex flex-1 items-center justify-center text-muted-foreground">
                {it.kind === 'video' ? (
                  <VideoIcon className="size-icon-lg" aria-hidden />
                ) : (
                  <FileText className="size-icon-lg" aria-hidden />
                )}
              </span>
            )}
            <span className="truncate bg-card/90 px-2 py-1 text-xs font-medium">
              {it.file.name}
            </span>
            {it.status === 'uploading' && (
              <span className="absolute inset-x-2 bottom-8">
                <Progress
                  value={it.progressPercent ?? 0}
                  size="sm"
                  label={`Enviando ${it.file.name}`}
                />
              </span>
            )}
            {it.status === 'error' && (
              <span className="absolute inset-x-2 bottom-8 truncate rounded-item bg-destructive-soft px-2 py-1 text-xs font-medium text-destructive-soft-foreground">
                {it.errorMessage}
              </span>
            )}
            <span className="absolute top-1 right-1 flex gap-1">
              {it.status === 'error' && !it.error?.startsWith('Arquivo maior') && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`Tentar enviar ${it.file.name} de novo`}
                  className="bg-card/90"
                  onClick={() => retry(it)}
                >
                  <RotateCw />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Remover ${it.file.name}`}
                className="bg-card/90"
                onClick={() => remove(it.id)}
              >
                <Trash2 />
              </Button>
            </span>
            <span className="absolute top-1 left-1 flex items-center gap-1">
              {handle(it)}
              {it.status === 'done' && (
                <BrandFeedbackIcon type="success" size="sm" animated label="Enviado" />
              )}
            </span>
          </Item>
        )),
      )}
    </ul>
  )

  return (
    <div data-rendra={code} className="flex min-w-0 flex-col gap-3">
      {pendingCrop[0] && (
        <ImageCropper
          file={pendingCrop[0]}
          aspects={crop?.aspects ?? [{ id: 'livre', label: 'Livre', ratio: 1 }]}
          maxOutputWidth={crop?.maxOutputWidth}
          onCancel={() => setPendingCrop((q) => q.slice(1))}
          onConfirm={(cropped) => {
            setPendingCrop((q) => q.slice(1))
            const created = createItem(cropped)
            insertItems([created])
            if (created.status === 'uploading') send(created)
          }}
        />
      )}
      {dropzone}
      {layout === 'gallery' ? galleryView : listView}
    </div>
  )
}
