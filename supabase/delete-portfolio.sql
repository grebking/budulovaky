-- Run this in Supabase → SQL Editor to delete portfolio-related tables
-- WARNING: This will delete all portfolio data permanently

-- Drop portfolio-specific tables (order matters due to foreign keys)
drop table if exists bet_comments cascade;
drop table if exists bet_results cascade;
drop table if exists profiles cascade;

-- Note: bets and bet_entries tables are kept as they are core betting functionality
