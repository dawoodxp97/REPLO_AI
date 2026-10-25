export interface DiagramStep {
  from: string
  to: string
  label: string | null
}

const NODE_DECLARATION = /([A-Za-z][\w-]*)\s*(?:\[|\()+"?([^"\]()]+?)"?(?:\]|\))+/g
const EDGE = /^\s*([A-Za-z][\w-]*)[^\n]*?-->\s*(?:\|([^|]+)\|\s*)?([A-Za-z][\w-]*)/

export function describeFlowchart(definition: string): DiagramStep[] {
  const labels = nodeLabels(definition)
  return definition
    .split('\n')
    .map((line) => EDGE.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({
      from: labels.get(match[1] ?? '') ?? match[1] ?? '',
      to: labels.get(match[3] ?? '') ?? match[3] ?? '',
      label: match[2]?.trim() || null,
    }))
}

function nodeLabels(definition: string): Map<string, string> {
  const labels = new Map<string, string>()
  for (const match of definition.matchAll(NODE_DECLARATION)) {
    const [, id, label] = match
    if (id && label) labels.set(id, label.trim())
  }
  return labels
}
