CREATE TABLE IF NOT EXISTS public.wizard_sessions (
  session_key text PRIMARY KEY,
  state jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
