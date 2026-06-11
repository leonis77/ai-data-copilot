-- 在 Supabase SQL Editor 中执行以下语句

CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  rows JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  summary TEXT,
  insights JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  dataset_id TEXT REFERENCES datasets(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datasets_created ON datasets(created_at DESC);
CREATE INDEX idx_analysis_dataset ON analysis_results(dataset_id, created_at DESC);
CREATE INDEX idx_chat_dataset ON chat_history(dataset_id, created_at ASC);