const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const CHEAP_MODELS = [
  process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
  'qwen/qwen-2.5-7b-instruct',
  'deepseek/deepseek-chat-v3-0324',
];

export function openRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

export type ChatJson = Record<string, unknown>;

function parseJsonObject(raw: string): ChatJson | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as ChatJson) : null;
  } catch {
    return null;
  }
}

async function completeOnce(model: string, system: string, user: string) {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'https://yeohang.lexid.site',
      'X-Title': 'YEOHANG GALJIDO',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const doc = (await r.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  if (!r.ok) throw new Error(doc?.error?.message || `OpenRouter ${r.status}`);
  const content = String(doc?.choices?.[0]?.message?.content || '');
  const json = parseJsonObject(content);
  if (!json) throw new Error('모델이 JSON을 반환하지 않았습니다.');
  return { model, json };
}

export async function completeJson(system: string, user: string) {
  if (!openRouterConfigured()) return null;
  let last = '';
  const models = [...new Set(CHEAP_MODELS.filter(Boolean))];
  for (const model of models) {
    try {
      return await completeOnce(model, system, user);
    } catch (err) {
      last = err instanceof Error ? err.message : '모델 호출 실패';
    }
  }
  throw new Error(last || 'OpenRouter 호출 실패');
}
