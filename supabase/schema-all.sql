-- Run this ONCE in Supabase → SQL Editor (combines schema.sql + schema-v2.sql + schema-v3.sql)

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'Other',
  event_date timestamptz not null,
  side1_label text not null,
  side2_label text not null,
  rules text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'scratch')),
  winner text check (winner in ('side1', 'side2', 'scratch')),
  created_by_id text not null,
  created_by_label text not null,
  creator_username text,
  created_at timestamptz not null default now()
);

create table if not exists bet_entries (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id) on delete cascade,
  user_id text not null,
  user_label text not null,
  side smallint not null check (side in (1, 2)),
  stake numeric not null check (stake > 0),
  filled_stake numeric not null default 0 check (filled_stake >= 0),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

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

create index if not exists bet_entries_bet_id_idx on bet_entries(bet_id);
create index if not exists bet_results_user_id_idx on bet_results(user_id);
create index if not exists profiles_username_idx on profiles(username);

alter table bets enable row level security;
alter table bet_entries enable row level security;
alter table profiles enable row level security;
alter table bet_results enable row level security;

create policy "bets read" on bets for select using (true);
create policy "bets insert" on bets for insert with check (true);
create policy "bets update" on bets for update using (true);

create policy "entries read" on bet_entries for select using (true);
create policy "entries insert" on bet_entries for insert with check (true);
create policy "entries update" on bet_entries for update using (true);

create policy "profiles read" on profiles for select using (true);
create policy "profiles insert" on profiles for insert with check (true);
create policy "profiles update" on profiles for update using (true);

create policy "results read" on bet_results for select using (true);
create policy "results insert" on bet_results for insert with check (true);

alter table bet_entries add column if not exists filled_stake numeric not null default 0 check (filled_stake >= 0);
alter table bet_entries add column if not exists status text not null default 'active' check (status in ('active', 'cancelled'));
alter table bet_entries add column if not exists cancelled_at timestamptz;
alter table bets add column if not exists creator_username text;
