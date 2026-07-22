
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.medlineplus_url_state (
  url text PRIMARY KEY,
  last_hash text,
  last_title text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.medlineplus_url_state TO authenticated;
GRANT ALL ON public.medlineplus_url_state TO service_role;
ALTER TABLE public.medlineplus_url_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read url state" ON public.medlineplus_url_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
