-- Shared durable JSON store for Vercel (registrations, jobs, chat, fleet).
-- Run once in Supabase → SQL Editor, then redeploy.

create table if not exists public.rsa_store (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rsa_store enable row level security;

drop policy if exists "rsa_store_read" on public.rsa_store;
drop policy if exists "rsa_store_write" on public.rsa_store;
drop policy if exists "rsa_store_all" on public.rsa_store;

-- Demo/platform access via anon key (tighten later for production)
create policy "rsa_store_all"
  on public.rsa_store
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.rsa_store to anon, authenticated;
