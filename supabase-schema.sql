create extension if not exists pgcrypto;
create table if not exists public.salonnext_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  salon_type text not null,
  audience text not null,
  recent_patterns text not null,
  goal text not null,
  input_payload jsonb not null,
  output_payload jsonb not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  model text not null
);
alter table public.salonnext_requests enable row level security;
revoke all on public.salonnext_requests from anon, authenticated;

