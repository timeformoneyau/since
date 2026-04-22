-- Since app — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Items table
create table if not exists public.items (
  id            text        primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  category      text        not null default 'Other',
  last_done_date text       not null,
  history       jsonb       not null default '[]'::jsonb,
  repeat_value  integer,
  repeat_unit   text        check (repeat_unit in ('days', 'weeks', 'months', 'years')),
  created_at    timestamptz not null,
  updated_at    timestamptz not null
);

-- Row-level security: users can only access their own items
alter table public.items enable row level security;

create policy "users_own_items"
  on public.items
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own auth account
-- (cascades to items via foreign key)
create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_user() to authenticated;
