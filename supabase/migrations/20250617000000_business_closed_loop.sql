-- ProcureWise Business Closed-Loop Tables
-- Run this in Supabase SQL Editor after the base tables exist.
--
-- Tables:
--   analysis_runs  - Pipeline execution snapshots
--   decisions      - Business decisions derived from analysis
--   action_tasks   - Actionable tasks from decisions
--   executions     - Execution records of tasks
--   outcomes       - Outcome measurements after execution

-- ═══ analysis_runs ═══
create table if not exists public.analysis_runs (
  id text primary key,
  dataset_id text not null references public.datasets(id) on delete cascade,
  input text not null,
  chain_snapshot jsonb not null default '{}'::jsonb,
  pipeline_latency integer not null default 0,
  platform text,
  industry text,
  freshness_score integer not null default 0,
  web_search_triggered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_runs_dataset
  on public.analysis_runs (dataset_id, created_at desc);

create index if not exists idx_analysis_runs_platform
  on public.analysis_runs (platform) where platform is not null;

-- ═══ decisions ═══
create table if not exists public.decisions (
  id text primary key,
  analysis_run_id text not null references public.analysis_runs(id) on delete cascade,
  dataset_id text not null references public.datasets(id) on delete cascade,
  summary text not null,
  verdict text not null,
  confidence numeric not null default 0.5,
  status text not null default 'pending',
  product_names text[] not null default '{}',
  evidence_card_indices integer[] not null default '{}',
  expected_profit_impact numeric not null default 0,
  risk_level text not null default 'low',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decisions_dataset
  on public.decisions (dataset_id, created_at desc);

create index if not exists idx_decisions_status
  on public.decisions (status) where status in ('pending', 'approved');

-- ═══ action_tasks ═══
create table if not exists public.action_tasks (
  id text primary key,
  decision_id text not null references public.decisions(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null,
  status text not null default 'pending',
  evidence_refs integer[] not null default '{}',
  rule_ids text[] not null default '{}',
  expected_profit_impact numeric not null default 0,
  risk_level text not null default 'low',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_action_tasks_decision
  on public.action_tasks (decision_id, created_at asc);

create index if not exists idx_action_tasks_status
  on public.action_tasks (status) where status in ('pending', 'in_progress');

-- ═══ executions ═══
create table if not exists public.executions (
  id text primary key,
  action_task_id text not null references public.action_tasks(id) on delete cascade,
  status text not null default 'running',
  result text,
  executed_by text,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_executions_task
  on public.executions (action_task_id, created_at desc);

-- ═══ outcomes ═══
create table if not exists public.outcomes (
  id text primary key,
  execution_id text not null references public.executions(id) on delete cascade,
  metric text not null,
  before_value numeric not null default 0,
  after_value numeric not null default 0,
  improvement numeric not null default 0,
  improvement_percent numeric not null default 0,
  verified_at timestamptz not null default now()
);

create index if not exists idx_outcomes_execution
  on public.outcomes (execution_id, verified_at desc);
