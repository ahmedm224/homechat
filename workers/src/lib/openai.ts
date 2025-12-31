import type { ModelType } from '../types'

const ADULT_SYSTEM_PROMPT = `You are a helpful AI assistant for {username}.
- Address the user by their name naturally in conversation
- Provide factual, logical responses
- Do not offer emotional support or therapy
- Focus on accuracy and practical solutions
- Be direct and concise`

const KID_SYSTEM_PROMPT = `You are a helpful AI assistant for {username}, a child.
- Address the user by their name naturally in conversation
- Use simple, age-appropriate language
- Provide factual, educational responses
- Do not discuss adult topics, violence, or inappropriate content
- Be encouraging but stick to facts
- Redirect inappropriate questions politely
- Keep explanations simple and engaging`

const MODEL_CONFIG = {
  fast: {
    model: 'gpt-4.1-mini',
    temperature: 0.7,
  },
  thinking: {
    model: 'o4-mini',
    reasoning_effort: 'medium',
    temperature: 1,
  },
} as const

interface TextContent {
  type: 'text'
  text: string
}

interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string
  }
}

type MessageContent = string | Array<TextContent | ImageContent>

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: MessageContent
}

interface OpenAIStreamOptions {
  messages: ChatMessage[]
  modelType: ModelType
  userRole: 'admin' | 'adult' | 'kid'
  username: string
  apiKey: string
  webSearchContext?: string
}

export function getSystemPrompt(userRole: 'admin' | 'adult' | 'kid', username: string): string {
  const template = userRole === 'kid' ? KID_SYSTEM_PROMPT : ADULT_SYSTEM_PROMPT
  return template.replace('{username}', username)
}

export async function* streamChatCompletion(
  options: OpenAIStreamOptions
): AsyncGenerator<string, void, unknown> {
  const { messages, modelType, userRole, username, apiKey, webSearchContext } = options
  const config = MODEL_CONFIG[modelType]

  const systemPrompt = getSystemPrompt(userRole, username)
  let fullSystemPrompt = systemPrompt

  if (webSearchContext) {
    fullSystemPrompt += `\n\nWeb search results for context:\n${webSearchContext}`
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...messages,
  ]

  const body: Record<string, unknown> = {
    model: config.model,
    messages: allMessages,
    stream: true,
  }

  if (modelType === 'fast') {
    body.temperature = config.temperature
  } else {
    body.reasoning_effort = (config as typeof MODEL_CONFIG.thinking).reasoning_effort
    body.temperature = config.temperature
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const content = json.choices?.[0]?.delta?.content
        if (content) {
          yield content
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }
}

export async function chatCompletion(
  options: Omit<OpenAIStreamOptions, 'stream'>
): Promise<string> {
  let result = ''
  for await (const chunk of streamChatCompletion(options)) {
    result += chunk
  }
  return result
}
