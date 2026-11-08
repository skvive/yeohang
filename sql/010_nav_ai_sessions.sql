-- 여행갈지도 NAV app-owned AI sessions (not ChatGPT consumer chat history)
-- Apply as additive schema migration only, after review and before enabling the API route.
-- User isolation is always enforced by authenticated Neon Auth email in server code.
CREATE TABLE IF NOT EXISTS nav_ai_sessions (
    user_email TEXT NOT NULL,
    session_id UUID NOT NULL,
    previous_response_id TEXT,
    last_question TEXT NOT NULL DEFAULT '',
    last_answer TEXT NOT NULL DEFAULT '',
    message_count INTEGER NOT NULL DEFAULT 0,
    last_request_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_email, session_id)
);
CREATE INDEX IF NOT EXISTS nav_ai_sessions_recent_idx
    ON nav_ai_sessions (user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS nav_ai_daily_usage (
    user_email TEXT NOT NULL,
    usage_date DATE NOT NULL,
    call_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_email, usage_date)
);
-- No raw microphone data, GPS coordinates, signing keys, or OAuth tokens stored.
