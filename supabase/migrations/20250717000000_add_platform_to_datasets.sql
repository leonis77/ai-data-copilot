-- Add platform column to datasets table
-- This supports persisted platform detection and cross-platform analysis

alter table public.datasets
  add column if not exists platform text;

create index if not exists idx_datasets_platform
  on public.datasets (platform) where platform is not null;
