-- Run this in Supabase SQL Editor AFTER the original schema.sql

create table if not exists profiles (
  user_id text primary key,
  username text unique not null,
  bio text not null default '',
  avatar_url text not null default '',
  balance numeric not null default 50 check (balance >= 0),
  name_changed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists bet_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bet_id uuid references bets(id) on delete set null,
  profit numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists bet_results_user_id_idx on bet_results(user_id);
create index if not exists profiles_username_idx on profiles(username);

alter table profiles enable row level security;
alter table bet_results enable row level security;

create policy "profiles read" on profiles for select using (true);
create policy "profiles insert" on profiles for insert with check (true);
create policy "profiles update" on profiles for update using (true);

create policy "results read" on bet_results for select using (true);
create policy "results insert" on bet_results for insert with check (true);

-- Optional: add creator username on bets for faster links
alter table bets add column if not exists creator_username text;
