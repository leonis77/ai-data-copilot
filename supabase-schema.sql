-- 在 Supabase SQL Editor 中执行以下全部内容

-- 1. 创建数据表
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  rows JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  summary TEXT,
  insights JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  dataset_id TEXT REFERENCES datasets(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_created ON datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_dataset ON analysis_results(dataset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_dataset ON chat_history(dataset_id, created_at ASC);

-- 2. 关闭 RLS（开发阶段），或创建策略
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;

-- 如果上面的 DISABLE 不生效，用下面的策略替代：
-- CREATE POLICY "Allow all" ON datasets FOR ALL USING (true);
-- CREATE POLICY "Allow all" ON analysis_results FOR ALL USING (true);
-- CREATE POLICY "Allow all" ON chat_history FOR ALL USING (true);