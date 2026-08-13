-- Run in Supabase SQL Editor after schema-v2.sql

-- Partial fills: requested stake vs amount matched at close
alter table bet_entries add column if not exists filled_stake numeric not null default 0 check (filled_stake >= 0);
alter table bet_entries add column if not exists status text not null default 'active' check (status in ('active', 'cancelled'));
alter table bet_entries add column if not exists cancelled_at timestamptz;

create policy "entries update" on bet_entries for update using (true);
