import { auth } from '@/lib/auth/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORIGIN = 'https://yeohang.lexid.site';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noCache = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noCache });
}
async function userEmail() {
  try {
    const { data } = await auth.getSession();
    return data?.user?.email?.toLowerCase().trim() || null;
  } catch {
    return null;
  }
}
export async function GET() {
  const email = await userEmail();
  if (!email) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const rows = await dbQuery(
      'SELECT session_id,last_question,last_answer,message_count,updated_at FROM nav_ai_sessions WHERE user_email=$1 ORDER BY updated_at DESC LIMIT 12',
      [email]
    );
    return json({ sessions: rows.map((row) => ({
      session_id: row.session_id,
      last_question: String(row.last_question || '').slice(0, 140),
      last_answer: String(row.last_answer || '').slice(0, 300),
      message_count: Number(row.message_count || 0),
      updated_at: row.updated_at,
    })) });
  } catch {
    return json({ error: 'AI_DB_NOT_READY' }, 503);
  }
}

/* App-owned conversation, not an import of personal ChatGPT consumer chat history. */
export async function POST(req: Request) {
  const email = await userEmail();
  if (!email) return json({ error: 'AUTH_REQUIRED' }, 401);
  const origin = req.headers.get('origin');
  if (origin && origin !== ORIGIN) return json({ error: 'ORIGIN_REJECTED' }, 403);
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return json({ error: 'JSON_REQUIRED' }, 415);
  if (Number(req.headers.get('content-length') || 0) > 4096)
    return json({ error: 'BODY_TOO_LARGE' }, 413);
  let body: unknown;
  try { body = await req.json(); }
  catch { return json({ error: 'INVALID_JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'INVALID_INPUT' }, 400);
  const input = body as Record<string, unknown>;
  const sessionId = typeof input.session_id === 'string' ? input.session_id.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!UUID_RE.test(sessionId) || !message || message.length > 500)
    return json({ error: 'INVALID_INPUT' }, 400);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return json({ error: 'AI_NOT_CONFIGURED' }, 503);

  let previous: string | null = null;
  try {
    const total = await dbQuery(
      'SELECT COUNT(*)::int AS count FROM nav_ai_sessions WHERE user_email=$1',
      [email]
    );
    if (Number(total[0]?.count || 0) >= 20) {
      const existing = await dbQuery(
        'SELECT session_id FROM nav_ai_sessions WHERE user_email=$1 AND session_id=$2::uuid',
        [email, sessionId]
      );
      if (!existing.length) return json({ error: 'SESSION_QUOTA_EXCEEDED' }, 429);
    }
    await dbQuery(
      'INSERT INTO nav_ai_sessions(user_email,session_id) VALUES($1,$2::uuid) ON CONFLICT (user_email,session_id) DO NOTHING',
      [email, sessionId]
    );
    const selected = await dbQuery(
      "UPDATE nav_ai_sessions SET last_request_at=NOW() WHERE user_email=$1 AND session_id=$2::uuid AND (last_request_at IS NULL OR last_request_at < NOW() - INTERVAL '5 seconds') RETURNING previous_response_id,message_count",
      [email, sessionId]
    );
    if (!selected.length) return json({ error: 'PLEASE_SLOW_DOWN' }, 429);
    if (Number(selected[0].message_count || 0) >= 120)
      return json({ error: 'SESSION_MESSAGE_LIMIT' }, 429);
    previous = selected[0].previous_response_id ? String(selected[0].previous_response_id) : null;
    const quota = await dbQuery(
      "INSERT INTO nav_ai_daily_usage(user_email,usage_date,call_count) VALUES($1,(NOW() AT TIME ZONE 'Asia/Seoul')::date,1) ON CONFLICT (user_email,usage_date) DO UPDATE SET call_count=nav_ai_daily_usage.call_count+1 WHERE nav_ai_daily_usage.call_count < 30 RETURNING call_count",
      [email]
    );
    if (!quota.length) return json({ error: 'DAILY_AI_LIMIT' }, 429);
  } catch {
    return json({ error: 'AI_DB_NOT_READY' }, 503);
  }

  const payload: Record<string, unknown> = {
    model: process.env.NAV_AI_MODEL?.trim() || 'gpt-4.1-mini',
    instructions: '당신은 여행갈지도 NAV의 한국어 여행 보조 AI입니다. 1~3문장으로 간결히 답하세요. 실시간 교통, 실제 경로, 운영시간, 위치를 확인하지 않았다면 확인했다고 말하지 마세요. 직접 길안내를 시작·종료했다고 주장하지 마세요. 주행 중 화면 조작은 정차 후 진행하도록 안내하세요.',
    input: [{ role: 'user', content: message }],
    store: true,
    max_output_tokens: 400,
  };
  if (previous) payload.previous_response_id = previous;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return json({ error: 'AI_PROVIDER_ERROR' }, 502);
    const data = await response.json() as {
      id?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const answer = (data.output || []).flatMap((x) => x.content || [])
      .filter((x) => x.type === 'output_text').map((x) => x.text || '')
      .join('\n').trim().slice(0, 1500);
    if (!answer || !data.id) return json({ error: 'AI_EMPTY_RESPONSE' }, 502);
    try {
      await dbQuery(
        'UPDATE nav_ai_sessions SET previous_response_id=$3,last_question=$4,last_answer=$5,message_count=message_count+1,updated_at=NOW() WHERE user_email=$1 AND session_id=$2::uuid',
        [email, sessionId, data.id, message.slice(0, 500), answer]
      );
    } catch { return json({ error: 'AI_SESSION_SAVE_FAILED' }, 503); }
    return json({ session_id: sessionId, reply: answer, source: 'openai-responses', authenticated: true });
  } catch {
    return json({ error: 'AI_PROVIDER_UNAVAILABLE' }, 502);
  }
}
