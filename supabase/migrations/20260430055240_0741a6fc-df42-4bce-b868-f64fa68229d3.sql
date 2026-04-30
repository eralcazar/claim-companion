create table if not exists public.ai_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

create policy "ai_settings_read_all"
  on public.ai_settings for select
  to authenticated
  using (true);

create policy "ai_settings_admin_insert"
  on public.ai_settings for insert
  to authenticated
  with check (public.has_role(auth.uid(),'admin'::app_role));

create policy "ai_settings_admin_update"
  on public.ai_settings for update
  to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role))
  with check (public.has_role(auth.uid(),'admin'::app_role));

create policy "ai_settings_admin_delete"
  on public.ai_settings for delete
  to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role));

create trigger ai_settings_set_updated_at
  before update on public.ai_settings
  for each row execute function public.update_updated_at_column();

insert into public.ai_settings(key,value) values
  ('kari_active_model','"google/gemini-3-flash-preview"'::jsonb)
on conflict (key) do nothing;