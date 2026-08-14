-- Run this in Supabase → SQL Editor (one time)
-- This adds support for comments, fake balance, profile editing limits, and sell positions

-- Add comments table
create table if not exists bet_comments (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id) on delete cascade,
  user_id text not null,
  user_label text not null,
  content text not null,
  side smallint check (side in (1, 2)),
  stake numeric default 0,
  created_at timestamptz not null default now()
);

create index if not exists bet_comments_bet_id_idx on bet_comments(bet_id);
create index if not exists bet_comments_user_id_idx on bet_comments(user_id);

-- Add fake balance tracking to bets
alter table bets add column if not exists fake_balance_side1 numeric default 0;
alter table bets add column if not exists fake_balance_side2 numeric default 0;
alter table bets add column if not exists fake_balance_target numeric default 0;
alter table bets add column if not exists fake_balance_last_updated timestamptz;

-- Add bio change tracking to profiles
alter table profiles add column if not exists bio_change_count integer default 0;
alter table profiles add column if not exists bio_last_changed_at timestamptz;

-- Add sell position tracking
alter table bet_entries add column if not exists is_sell_position boolean default false;
alter table bet_entries add column if not exists sold_at timestamptz;
alter table bet_entries add column if not exists sell_price numeric default 0;

-- Add archive tracking to bets
alter table bets add column if not exists archived_at timestamptz;
alter table bets add column if not exists is_archived boolean default false;

-- Enable RLS
alter table bet_comments enable row level security;

create policy "comments read" on bet_comments for select using (true);
create policy "comments insert" on bet_comments for insert with check (true);
create policy "comments update" on bet_comments for update using (true);
