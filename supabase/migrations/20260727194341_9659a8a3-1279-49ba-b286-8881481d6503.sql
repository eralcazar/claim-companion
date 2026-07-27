
CREATE TABLE public.mexicoes_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mexicoes_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'linked',
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mexicoes_links_user_unique ON public.mexicoes_links(user_id);
CREATE UNIQUE INDEX mexicoes_links_external_unique ON public.mexicoes_links(mexicoes_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mexicoes_links TO authenticated;
GRANT ALL ON public.mexicoes_links TO service_role;
ALTER TABLE public.mexicoes_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mexicoes link"
ON public.mexicoes_links FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all mexicoes links"
ON public.mexicoes_links FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mexicoes_links_updated_at
BEFORE UPDATE ON public.mexicoes_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mexicoes_bridge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mexicoes_user_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mexicoes_bridge_events_created_idx ON public.mexicoes_bridge_events(created_at DESC);

GRANT SELECT ON public.mexicoes_bridge_events TO authenticated;
GRANT ALL ON public.mexicoes_bridge_events TO service_role;
ALTER TABLE public.mexicoes_bridge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view bridge events"
ON public.mexicoes_bridge_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.home_visit_requests
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS external_ref text;
