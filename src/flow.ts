/*
 * ENTRADA SEPARADA: Fluxos de automação (@rendra-ui/web/flow)
 * ------------------------------------------------------------
 * Fora da entrada principal (src/index.ts): depende de `@xyflow/react` (React Flow), pesado, só
 * entra no bundle de quem realmente monta ou mostra fluxos. O CSS da biblioteca é importado
 * pelos componentes e resolvido do node_modules de quem usa o pacote. O que o host precisa: o
 * JSON (`Flow`), a validação (`validateFlow`) e a leitura e gravação do texto (`parseFlow`,
 * `serializeFlow`); as funções de edição ficam internas.
 */
export { FlowEditor, type FlowEditorProps } from './components/ui/flow-editor'
export { FlowViewer, type FlowViewerProps } from './components/ui/flow-viewer'
export {
  parseFlow,
  serializeFlow,
  validateFlow,
  type Flow,
  type FlowBranch,
  type FlowEdge,
  type FlowIssue,
  type FlowNode,
  type FlowNodeType,
  type FlowRule,
  type FlowRuleOperator,
  type ParseResult,
} from './lib/flow'
