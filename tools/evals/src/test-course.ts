import {
  CONTENT_SCHEMA_VERSION,
  CourseContent,
  type CourseGraph,
  type DiagramSpec,
  type SourceRef,
} from '@replo/contracts'
import type { SnapshotFacts } from './snapshot'
import type { TruthSheet } from './truth-sheet'

export const testSnapshot: SnapshotFacts = {
  files: [
    { path: 'src/a.ts', blobSha: 'sha-a', lineCount: 10 },
    { path: 'src/b.ts', blobSha: 'sha-b', lineCount: 8 },
  ],
  symbols: [
    { symbolKey: 'src/a.ts#run', name: 'run', path: 'src/a.ts', startLine: 1, endLine: 4 },
    { symbolKey: 'src/b.ts#call', name: 'call', path: 'src/b.ts', startLine: 1, endLine: 3 },
  ],
  edges: [{ fromPath: 'src/a.ts', toPath: 'src/b.ts', kind: 'import' }],
}

export const testTruth: TruthSheet = {
  repo: { owner: 'synthetic', name: 'sample', commitSha: '0'.repeat(40) },
  source: { kind: 'fixture', path: 'sample' },
  shape: 'rest-api',
  size: 'small',
  entryPoints: ['src/a.ts'],
  keyFlows: [{ name: 'run', hops: ['src/a.ts', 'src/b.ts'] }],
  coreModules: ['src/a.ts', 'src/b.ts'],
  graphSymbols: ['src/a.ts#run'],
  facts: [
    { claim: 'run calls call', evidencePath: 'src/a.ts' },
    { claim: 'call returns', evidencePath: 'src/b.ts' },
  ],
  forbiddenStrings: [],
  index: {
    entryPoints: [{ path: 'src/a.ts', kind: 'main' }],
    routes: [],
    imports: [['src/a.ts', 'src/b.ts']],
    symbols: ['src/a.ts#run'],
    unresolvedImports: 0,
    parseErrors: [],
  },
}

export const testRefs: Record<string, SourceRef> = {
  r_a: { path: 'src/a.ts', startLine: 1, endLine: 4, blobSha: 'sha-a', symbolKey: 'src/a.ts#run' },
  r_b: { path: 'src/b.ts', startLine: 1, endLine: 3, blobSha: 'sha-b', symbolKey: 'src/b.ts#call' },
  r_c: { path: 'src/a.ts', startLine: 1, endLine: 10, blobSha: 'sha-a' },
}

export const testGraph: CourseGraph = {
  nodes: [
    { id: 'file:src/a.ts', kind: 'file', label: 'src/a.ts', path: 'src/a.ts' },
    { id: 'file:src/b.ts', kind: 'file', label: 'src/b.ts', path: 'src/b.ts' },
    {
      id: 'sym:src/a.ts#run',
      kind: 'symbol',
      label: 'run',
      path: 'src/a.ts',
      symbolKey: 'src/a.ts#run',
    },
    { id: 'group:src', kind: 'module', label: 'src' },
  ],
  edges: [
    { id: 'imports|a|b', from: 'file:src/a.ts', to: 'file:src/b.ts', kind: 'imports' },
    { id: 'contains|group|a', from: 'group:src', to: 'file:src/a.ts', kind: 'contains' },
    { id: 'contains|a|run', from: 'file:src/a.ts', to: 'sym:src/a.ts#run', kind: 'contains' },
  ],
}

export const testDiagram: DiagramSpec = {
  id: 'architecture',
  type: 'architecture',
  title: 'Architecture',
  caption: 'Two modules.',
  nodes: [
    { id: 'file:src/a.ts', label: 'src/a.ts', kind: 'file', refIds: ['r_a'] },
    { id: 'file:src/b.ts', label: 'src/b.ts', kind: 'file', refIds: ['r_b'] },
  ],
  edges: [{ id: 'e0', from: 'file:src/a.ts', to: 'file:src/b.ts', refIds: [] }],
}

export function testContent(): CourseContent {
  return CourseContent.parse({
    schemaVersion: CONTENT_SCHEMA_VERSION,
    meta: {
      title: 'Sample',
      repo: { owner: 'synthetic', name: 'sample', commitSha: '0'.repeat(40) },
      audience: 'intermediate',
      objectives: ['Read a'],
      prerequisites: [],
    },
    graph: testGraph,
    tours: [
      {
        key: 'start',
        title: 'Start',
        objective: 'Read a then b.',
        steps: [
          { title: 'a', summary: 'Read a.', nodeId: 'file:src/a.ts' },
          { title: 'b', summary: 'Read b.', nodeId: 'file:src/b.ts' },
        ],
      },
    ],
    diagrams: [testDiagram],
    architecture: {
      diagram: {
        type: 'diagram',
        mermaid: 'flowchart LR\n  g0 --> g1',
        nodeRefs: { g0: 'src', g1: 'src/a.ts' },
        caption: 'The source tree.',
      },
      blocks: [
        {
          type: 'prose',
          kind: 'observed',
          md: '`run` calls `call`.',
          evidence: [{ refId: 'r_a' }],
        },
      ],
    },
    chapters: ['a', 'b', 'c'].map((name, index) => ({
      key: `chapter-${index + 1}`,
      title: `Chapter ${name}`,
      summary: `Read ${name}.`,
      objectives: [`Read ${name}`],
      prerequisites: index === 0 ? [] : [`chapter-${index}`],
      lessons: [
        {
          key: `lesson-${index + 1}`,
          title: `Lesson ${name}`,
          minutes: 5,
          blocks: [
            {
              type: 'prose',
              kind: 'observed',
              md: `\`${name}\` is on this path.`,
              evidence: [{ refId: index === 0 ? 'r_a' : 'r_b' }],
            },
            {
              type: 'code',
              refId: index === 0 ? 'r_a' : 'r_b',
              caption: `Read ${name}.`,
            },
          ],
          quiz: [
            {
              key: `question-${index + 1}`,
              kind: 'multiple_choice',
              prompt: `Which module is chapter ${index + 1} about?`,
              options: [
                { key: 'a', text: 'src/a.ts' },
                { key: 'b', text: 'src/b.ts' },
                { key: 'c', text: 'src/c.ts' },
              ],
              correct: 'a',
              explanation: 'The chapter cites the first source as evidence.',
              evidence: [{ refId: 'r_a' }],
            },
          ],
        },
      ],
    })),
    sourceRefs: testRefs,
    furtherReading: [],
    openQuestions: [],
  })
}
