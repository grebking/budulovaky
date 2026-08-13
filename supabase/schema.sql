-- Run this in Supabase → SQL Editor (one time)

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

create index if not exists bet_entries_bet_id_idx on bet_entries(bet_id);

alter table bets enable row level security;
alter table bet_entries enable row level security;

create policy "bets read" on bets for select using (true);
create policy "bets insert" on bets for insert with check (true);
create policy "bets update" on bets for update using (true);

create policy "entries read" on bet_entries for select using (true);
create policy "entries insert" on bet_entries for insert with check (true);
create policy "entries update" on bet_entries for update using (true);
