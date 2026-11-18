import Link from 'next/link'
import type { ReactNode } from 'react'
import { KEYS_AND_PRIVACY_PAGE, KEY_GUIDE, PRIVACY_PAGE, TERMS_PAGE } from './routes'

export const HERO_ASSURANCES = [
  { claim: 'Free for individual developers', source: 'terms', href: TERMS_PAGE.href },
  { claim: 'Your key, your bill', source: 'your key', href: KEY_GUIDE.href },
  {
    claim: 'Your code is never executed',
    source: 'keys and privacy',
    href: KEYS_AND_PRIVACY_PAGE.href,
  },
] as const

export const PILLARS = [
  {
    title: 'The graph',
    body: 'Files, symbols and the imports, calls and inheritance edges between them, grouped by layer and business domain. Guided tours put a reading order on top.',
  },
  {
    title: 'The diagrams',
    body: 'Eight typed diagrams from architecture to lifecycle. Architecture, tree, class and ERD come from the graph; on the full path, the rest are model-authored and checked against it.',
  },
  {
    title: 'The course',
    body: 'Chapters built from tours and domains, lessons anchored to nodes and edges, and a short quiz after each chapter. Observed claims carry evidence; interpretation is labelled.',
  },
] as const

export const STEPS = [
  {
    title: 'Import',
    body: 'Paste a public GitHub URL, or pick a private repository through the read-only GitHub App. Pre-flight checks files, bytes, languages and framework before any model call.',
  },
  {
    title: 'Index',
    body: 'The import is pinned to one commit. Tree-sitter extracts files, symbols, imports, calls, extends and implements, then the system builds the structural graph.',
  },
  {
    title: 'Understand',
    body: 'On the full path, the model adds file summaries, architectural layers, domains and flows. Graph review checks coverage and every edge endpoint, then makes one repair pass.',
  },
  {
    title: 'Build',
    body: 'Tours order the graph by dependency. Diagrams come from the graph or from the model, validated. The outline maps chapters to tours and lessons to nodes.',
  },
  {
    title: 'Check',
    body: 'Every reference is grounded against the pinned snapshot. Failures are dropped, repaired once, or downgraded to interpretation. Low coverage publishes as a Draft.',
  },
] as const

export const GRAPH_POINTS = [
  {
    title: 'Layer-grouped map',
    body: 'Files and symbols are grouped by layer, with the same snapshot available as a tree and a table.',
  },
  {
    title: 'Node detail',
    body: 'Select a node for its summary, pinned source, incoming and outgoing edges, and the references that point at it.',
  },
  {
    title: 'Guided tours',
    body: 'Dependency-ordered paths with objectives and steps. A step opens the node or the lesson built from it.',
  },
  {
    title: 'Structural facts first',
    body: 'Tree-sitter extracts files, symbols, imports, calls, extends and implements. The same input gives the same graph; the model adds summaries and labels.',
  },
] as const

export const GRAPH_LAYERS = [
  { name: 'API', detail: 'Routes, handlers and endpoint definitions.' },
  { name: 'Service', detail: 'Domain logic and use cases.' },
  { name: 'Data', detail: 'Schemas, repositories, clients and storage.' },
  { name: 'UI', detail: 'Pages, components and hooks.' },
  { name: 'Utility', detail: 'Shared helpers, types and configuration.' },
  { name: 'Other', detail: 'Files outside the five layers.' },
] as const

export const DIAGRAM_FAMILIES = [
  {
    title: 'Built from the graph',
    body: 'The graph has the facts: nodes, edges and types. These diagrams are generated deterministically. A model does not draw them.',
    diagrams: [
      { name: 'Architecture', detail: 'The main layers and the direction of control and data.' },
      { name: 'Tree', detail: 'The file and module hierarchy of the snapshot.' },
      { name: 'Class', detail: 'Types and their extends and implements relationships.' },
      { name: 'ERD', detail: 'Data entities and the relationships between them.' },
    ],
  },
  {
    title: 'Model-authored, then validated',
    body: 'On the full path, where the graph has no formal record, the model proposes the steps. Every node must be a graph node, and every edge must join kept nodes.',
    diagrams: [
      { name: 'Sequence', detail: 'The order of calls through one flow.' },
      { name: 'Workflow', detail: 'The steps a process takes, from trigger to finish.' },
      { name: 'Dataflow', detail: 'Where data is produced, transformed and stored.' },
      { name: 'Lifecycle', detail: 'The states an entity moves through and what moves it.' },
    ],
  },
] as const

export const DIAGRAM_POINTS = [
  'Pan and zoom. Focus a node and follow its upstream or downstream reach.',
  'Evidence chips on nodes open the pinned source range.',
  'Every node must be a graph node, and every edge must join kept nodes. A diagram that fails is dropped.',
  'Each diagram has a caption and a list of its nodes, so it reads without the canvas.',
] as const

export const CHECKS = [
  { name: 'Path', detail: 'The file exists in the pinned snapshot.' },
  {
    name: 'Symbol',
    detail: 'The named symbol exists, or the closest match in the same file does.',
  },
  {
    name: 'Anchor quote',
    detail:
      'The quoted text appears after whitespace is normalised. A quote shorter than eight characters is not evidence.',
  },
  {
    name: 'Identifier',
    detail:
      'Every backticked identifier matches a symbol, a file or a dependency the repository declares.',
  },
  {
    name: 'Flow hop',
    detail: 'Every step in a flow matches an edge the index found. An unconnected hop is dropped.',
  },
  {
    name: 'Diagram endpoint',
    detail: 'Every node is a graph node, and every edge joins two kept nodes.',
  },
  {
    name: 'Markdown',
    detail: 'Raw HTML and unsafe links are removed before anything is shown.',
  },
] as const

export const PIPELINE_STAGES = [
  {
    name: 'ingest',
    detail:
      'Download one tarball for the pinned commit, extract it safely, and record the file inventory. Archives are streamed; repository code is never run.',
  },
  {
    name: 'index',
    detail:
      'Parse each file with tree-sitter and store symbols and file edges: imports, cross-file calls, extends and implements. Build the structural graph.',
  },
  {
    name: 'enrich',
    detail:
      'Summarise central files in batches, assign a layer and domain, and name flows and concepts. The lite path derives summaries from exported symbols without a model.',
  },
  {
    name: 'graph-review',
    detail:
      'Check coverage and referential integrity. Every edge endpoint must exist. One repair pass summarises the most central files still missing.',
  },
  {
    name: 'tours',
    detail:
      'Build dependency-ordered tours with objectives and steps. Every step is checked against the graph.',
  },
  {
    name: 'diagrams',
    detail:
      'Generate architecture, tree, class and ERD from the graph. Ask the model for sequence, workflow, dataflow and lifecycle, then validate every node and edge.',
  },
  {
    name: 'outline',
    detail:
      'Map chapters to tours and domains, and lessons to nodes and edges. Focus paths are normalised to files in the snapshot.',
  },
  {
    name: 'lessons',
    detail:
      'Write each chapter’s lessons and quiz, anchored to the graph and the chapter’s focus paths. The model points at code; it does not write the excerpt.',
  },
  {
    name: 'validate',
    detail:
      'Ground every lesson, allow one repair per failing lesson, resolve diagram nodes, and assemble the content with its validation report.',
  },
  {
    name: 'publish',
    detail:
      'Write one immutable course version in a transaction. A rerun creates the next version and keeps the previous one.',
  },
] as const

export const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Does Replo run my code?',
    a: 'No. Replo reads a repository as data. It does not install dependencies, build, test or execute anything, including examples written in a lesson.',
  },
  {
    q: 'Which languages are supported?',
    a: 'The structural index uses tree-sitter grammars for TypeScript, JavaScript, TSX and JSX. Other text languages are read as files and taught from pinned excerpts. A repository with no readable text files is refused at pre-flight.',
  },
  {
    q: 'What does Replo cost?',
    a: 'Nothing. Replo does not charge for runs and has no paid plans. Your provider bills you for the tokens a run uses. Each run has a token ceiling on the server; when it is reached the run stops with RUN_LIMIT_EXCEEDED.',
  },
  {
    q: 'Which key should I use?',
    a: 'OpenRouter. One key reaches many models, including :free models with limits per OpenRouter account. OpenAI, Google AI Studio and Anthropic keys also work.',
  },
  {
    q: 'Where does my code go?',
    a: (
      <>
        The model provider you chose receives the excerpts each stage needs, under its own terms.
        What Replo stores, and for how long, is in the{' '}
        <Link href={PRIVACY_PAGE.href} className="link-inline">
          privacy policy
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Can I use private repositories?',
    a: 'Yes. Install the read-only GitHub App on the repositories you choose. It asks for Contents and Metadata access only, and Replo fetches a short-lived token per run.',
  },
  {
    q: 'What happens when the repository changes?',
    a: 'Nothing is tracked. A rerun takes a fresh snapshot and publishes the next course version; the previous version stays. Stable lesson keys carry progress across versions.',
  },
  {
    q: 'How is this different from a reference wiki?',
    a: 'A reference wiki describes a codebase. Replo builds a graph, orders it into tours and lessons, and checks every citation and diagram edge against the pinned commit.',
  },
]
