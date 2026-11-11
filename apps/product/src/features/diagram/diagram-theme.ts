const OUTLINE = 'color-mix(in oklab, var(--foreground) 38%, var(--card))'

export const DIAGRAM_THEME_CSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: var(--muted);
    stroke: ${OUTLINE};
    stroke-width: 1px;
    filter: none;
  }
  .node .label, .nodeLabel, .node text { color: var(--foreground); fill: var(--foreground); }
  .cluster rect { fill: transparent; stroke: var(--border); stroke-dasharray: 4 3; filter: none; }
  .cluster .nodeLabel, .cluster-label { color: var(--muted-foreground); fill: var(--muted-foreground); }
  .flowchart-link, .edgePath .path { stroke: var(--muted-foreground); stroke-width: 1px; }
  .arrowheadPath, marker path { fill: var(--muted-foreground); stroke: var(--muted-foreground); }
  .edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg {
    background-color: var(--card);
    color: var(--muted-foreground);
  }
  .edgeLabel rect { fill: var(--card); opacity: 1; }
`

export function diagramFontFamily(): string {
  return getComputedStyle(document.body).fontFamily
}
