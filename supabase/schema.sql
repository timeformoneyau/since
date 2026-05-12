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

-- Notes column (run if not already added)
alter table public.items add column if not exists notes text;

-- ─── Supabase Storage — event-photos bucket ────────────────────────────────────────────
-- Run in SQL Editor OR create via Dashboard → Storage → New bucket
--
-- 1. Create private bucket:
--    insert into storage.buckets (id, name, public) values ('event-photos', 'event-photos', false);
--
-- 2. RLS: users can only access their own photos (path starts with their user ID)
create policy "users_own_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'event-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users_own_photos_select"
  on storage.objects for select
  using (bucket_id = 'event-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users_own_photos_delete"
  on storage.objects for delete
  using (bucket_id = 'event-photos' and auth.uid()::text = (storage.foldername(name))[1]);
