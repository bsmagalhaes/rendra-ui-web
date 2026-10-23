/*
 * ENTRADA PRINCIPAL DO PACOTE (@rendra-ui/web)
 * ----------------------------------------
 * Barrel da superfície pública: componentes de src/components/ui (menos os internos
 * overlay-shell, picker-panel, sortable-handle, e os cinco "pesados" com entrada própria
 * por subcaminho: document-viewer, rich-text-editor, chart, widget-grid, flow), as primitivas de
 * layout, o AppShell, o RendraProvider (sem depender de um roteador específico), o catálogo
 * de componentes, os hooks e as bibliotecas utilitárias, e a API de marca reutilizável
 * (src/brand/public.ts).
 *
 * Ficam fora daqui, cada um na própria entrada:
 *   @rendra-ui/web/router-bridge      a ponte com o react-router (único ponto que o importa)
 *   @rendra-ui/web/document-viewer    depende de pdfjs-dist
 *   @rendra-ui/web/rich-text-editor   depende de @tiptap/*
 *   @rendra-ui/web/chart              depende de recharts
 *   @rendra-ui/web/widget-grid        depende de react-grid-layout
 *   @rendra-ui/web/flow               depende de @xyflow/react
 *
 * O CSS (tokens.css, base.css, components.css) não entra aqui: é publicado como arquivo
 * pré-compilado (estratégia A, escolhida para o host nunca precisar ter o Tailwind
 * instalado), importado à parte ("@rendra-ui/web/tokens.css" etc.), gerado por
 * scripts/build-lib.mjs.
 */

// Componentes de interface
export * from './components/ui/accordion'
export * from './components/ui/action-bar'
export * from './components/ui/alert'
export * from './components/ui/avatar'
export * from './components/ui/badge'
export * from './components/ui/brand-feedback-icon'
export * from './components/ui/brand-logo'
export * from './components/ui/breadcrumb'
export * from './components/ui/button'
export * from './components/ui/button-group'
export * from './components/ui/calendar'
export * from './components/ui/card'
export * from './components/ui/chat'
export * from './components/ui/checkbox'
export * from './components/ui/checklist'
export * from './components/ui/color-picker'
export * from './components/ui/data-toolbar'
export * from './components/ui/date-picker'
export * from './components/ui/drawer'
export * from './components/ui/dropdown-menu'
export * from './components/ui/empty-state'
export * from './components/ui/error-page'
export * from './components/ui/field'
export * from './components/ui/form'
export * from './components/ui/image-cropper'
export * from './components/ui/image-viewer'
export * from './components/ui/info-hint'
export * from './components/ui/input'
export * from './components/ui/kanban'
export * from './components/ui/list'
export * from './components/ui/modal'
export * from './components/ui/otp-input'
export * from './components/ui/pagination'
export * from './components/ui/popover'
export * from './components/ui/progress'
export * from './components/ui/qr-code'
export * from './components/ui/radio-group'
export * from './components/ui/rating'
export * from './components/ui/rendra-credit'
export * from './components/ui/repeatable-field'
export * from './components/ui/select'
export * from './components/ui/separator'
export * from './components/ui/skeleton'
export * from './components/ui/slider'
export * from './components/ui/spinner'
export * from './components/ui/stat-card'
export * from './components/ui/switch'
export * from './components/ui/table'
export * from './components/ui/tabs'
export * from './components/ui/textarea'
export * from './components/ui/timeline'
export * from './components/ui/toast'
export * from './components/ui/tooltip'
export * from './components/ui/upload'
export * from './components/ui/wizard'

// Primitivas de layout
export * from './components/layout'

// AppShell
export * from './components/app-shell/app-shell'
export * from './components/app-shell/layout'
export * from './components/app-shell/types'

// Provider de navegação (genérico, sem depender de um roteador)
export * from './components/rendra-provider'
export type { MotionMode } from './lib/motion/motion-context'
export type { RendraMotion } from './lib/motion/motion-on'

// Catálogo de componentes (códigos, busca)
export * from './catalog/components'

// Hooks
export * from './hooks/use-breakpoint'
export * from './hooks/use-debounced-value'
export * from './hooks/use-fill-height'
export * from './hooks/use-lookup'
export * from './hooks/use-reduced-motion'

// Bibliotecas utilitárias
export * from './lib/cn'
export * from './lib/contrast'
export * from './lib/control'
export * from './lib/lookup'
export * from './lib/masks'
export * from './lib/qr-encode'
export * from './lib/shape'
export * from './lib/sortable'
export * from './lib/validators'

// Marca (provider, paleta, tema): API genérica, sem a marca de demonstração deste repositório
export * from './brand/public'
