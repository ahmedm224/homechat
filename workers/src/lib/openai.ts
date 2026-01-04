import type { ModelType } from '../types'

const ADULT_SYSTEM_PROMPT = `You are a helpful AI assistant for {username}.
- Address the user by their name naturally in conversation
- Maintain context from previous messages to understand the full conversation flow
- When provided with web search results, use them to answer the user's question accurately and cite them if applicable
- Provide factual, logical responses
- Do not offer emotional support or therapy
- Focus on accuracy and practical solutions
- Be direct and concise`

const KID_SYSTEM_PROMPT = `You are a helpful AI assistant for {username}, a child.
- Address the user by their name naturally in conversation
- Use simple, age-appropriate language
- Remember what we were talking about in previous messages
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

export type MessageContent = string | Array<TextContent | ImageContent>

export interface ChatMessage {
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

export async function generateSearchQuery(
  history: ChatMessage[],
  userMessage: string,
  apiKey: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Based on the conversation history and the following user message, generate a single, concise search query that best addresses the user\'s need. If the user\'s message is standalone, just use that. Output ONLY the query text.'
    },
    ...history.slice(-5), // Only look at the last 5 messages for context
    { role: 'user', content: userMessage }
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_CONFIG.fast.model,
      messages,
      temperature: 0.3, // Lower temperature for more deterministic output
      max_tokens: 100,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json() as any
  return data.choices?.[0]?.message?.content?.trim() || userMessage
}

export async function shouldUseWebSearch(
  history: ChatMessage[],
  userMessage: string,
  apiKey: string
): Promise<boolean> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        'You are a classifier that determines if a web search would help answer the user\'s request.',
        'Respond "YES" if the user is asking for:',
        '- News, headlines, trending topics, or current events.',
        '- Weather, forecasts, air quality, or conditions for a specific place and time.',
        '- Sports scores, schedules, live results, stocks/crypto prices, exchange rates, or any other live data.',
        '- Product details, reviews, prices, or availability.',
        '- Any topic where up-to-date information is better than your training data.',
        '- The conversation shows the assistant previously lacked information or could not answer.',
        'If you are even slightly unsure, respond "YES".',
        'Respond "NO" only if the request is clearly:',
        '- Purely creative writing, math, or coding.',
        '- Personal chitchat or greeting.',
        '- General static knowledge (e.g. history, definitions) that definitely hasn\'t changed.',
        'Output ONLY "YES" or "NO".'
      ].join(' ')
    },
    ...history.slice(-3), // Only look at the last 3 messages for context
    { role: 'user', content: userMessage }
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.fast.model,
        messages,
        temperature: 0, // Deterministic
        max_tokens: 5,
      }),
    })

    if (!response.ok) return false

    const data = await response.json() as any
    const result = data.choices?.[0]?.message?.content?.trim().toUpperCase()
    return result === 'YES'
  } catch (error) {
    console.error('Error checking for web search:', error)
    return false
  }
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
