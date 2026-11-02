export type DiagramStatus = 'waiting' | 'rendering' | 'ready' | 'failed'

export const DIAGRAM_STATUS_MESSAGE: Record<DiagramStatus, string> = {
  waiting: 'The diagram is drawn when it scrolls into view.',
  rendering: 'Drawing the diagram…',
  ready: '',
  failed: 'The diagram could not be drawn. The steps below describe it.',
}
