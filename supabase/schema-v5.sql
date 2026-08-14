-- Run this in Supabase → SQL Editor (one time)
-- This safely adds missing columns to existing tables

-- Add missing columns to profiles table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio_change_count') then
    alter table profiles add column bio_change_count integer default 0;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio_last_changed_at') then
    alter table profiles add column bio_last_changed_at timestamptz;
  end if;
end $$;

-- Add missing columns to bets table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'fake_balance_side1') then
    alter table bets add column fake_balance_side1 numeric default 0;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'fake_balance_side2') then
    alter table bets add column fake_balance_side2 numeric default 0;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'fake_balance_target') then
    alter table bets add column fake_balance_target numeric default 0;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'fake_balance_last_updated') then
    alter table bets add column fake_balance_last_updated timestamptz;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'archived_at') then
    alter table bets add column archived_at timestamptz;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bets' and column_name = 'is_archived') then
    alter table bets add column is_archived boolean default false;
  end if;
end $$;

-- Add missing columns to bet_entries table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'bet_entries' and column_name = 'is_sell_position') then
    alter table bet_entries add column is_sell_position boolean default false;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bet_entries' and column_name = 'sold_at') then
    alter table bet_entries add column sold_at timestamptz;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'bet_entries' and column_name = 'sell_price') then
    alter table bet_entries add column sell_price numeric default 0;
  end if;
end $$;

-- Create bet_comments table if it doesn't exist
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

-- Create indexes for bet_comments
create index if not exists bet_comments_bet_id_idx on bet_comments(bet_id);
create index if not exists bet_comments_user_id_idx on bet_comments(user_id);

-- Enable RLS on bet_comments
alter table bet_comments enable row level security;

-- Drop existing policies if they exist
drop policy if exists "comments read" on bet_comments;
drop policy if exists "comments insert" on bet_comments;
drop policy if exists "comments update" on bet_comments;

-- RLS Policies for bet_comments
create policy "comments read" on bet_comments for select using (true);
create policy "comments insert" on bet_comments for insert with check (true);
create policy "comments update" on bet_comments for update using (true);
