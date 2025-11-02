-- Ensure required extensions
create extension if not exists "pgcrypto";

-- Extend user_profiles with consent + voice fields
alter table public.user_profiles
  add column if not exists parent_email text,
  add column if not exists is_parent_confirmed boolean default false,
  add column if not exists voice_sample_url text,
  add column if not exists voice_profile_id text;

-- Parent confirmation tracking
create table if not exists public.parent_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  parent_email text not null,
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists parent_confirmations_token_idx on public.parent_confirmations (token);

-- Optional: leave RLS disabled for parent_confirmations (admin writes only)
alter table public.parent_confirmations disable row level security;
