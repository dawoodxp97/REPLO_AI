import { MockLanguageModelV3 } from 'ai/test'

interface PromptPart {
  type: string
  text?: string
}

interface PromptMessage {
  content: string | PromptPart[]
}

export type Scripted = (prompt: string) => unknown

export function promptText(messages: readonly PromptMessage[]): string {
  return messages
    .flatMap((message) =>
      typeof message.content === 'string'
        ? [message.content]
        : message.content.flatMap((part) => (part.type === 'text' && part.text ? [part.text] : [])),
    )
    .join('\n')
}

export function scriptedModel(script: Scripted): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async (options) => {
      const value = script(promptText(options.prompt as readonly PromptMessage[]))
      return {
        content: [{ type: 'text', text: JSON.stringify(value) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 50, text: 50, reasoning: undefined },
        },
        warnings: [],
      }
    },
  })
}
