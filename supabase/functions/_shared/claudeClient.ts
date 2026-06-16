const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') ?? ''
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000,
): Promise<string> {
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Claude API error (${res.status}): ${text}`)
      return ''
    }

    const data = await res.json()
    return (data.content?.[0]?.text as string) ?? ''
  } catch (err) {
    console.error('callClaude error:', err)
    return ''
  }
}
