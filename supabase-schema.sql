-- ============================================================
-- ProcureWise Supabase Schema v2
-- 在 Supabase SQL Editor 中执行全部内容
-- https://supabase.com/dashboard → 选择项目 → SQL Editor
-- ============================================================

-- 1. 创建数据表
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  rows JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  semantic_roles JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  summary TEXT,
  insights JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  dataset_id TEXT REFERENCES datasets(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_datasets_created ON datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_dataset ON analysis_results(dataset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_dataset ON chat_history(dataset_id, created_at ASC);

-- 3. RLS 配置 — 开发阶段关闭，生产环境改为策略
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;

-- 4. 如果 DISABLE RLS 不生效，创建宽松策略作为后备
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'datasets' AND rowsecurity = true
  ) THEN
    CREATE POLICY "Allow all on datasets" ON datasets FOR ALL USING (true);
    CREATE POLICY "Allow all on analysis_results" ON analysis_results FOR ALL USING (true);
    CREATE POLICY "Allow all on chat_history" ON chat_history FOR ALL USING (true);
  END IF;
END $$;

-- 5. 验证：建表后应看到 3 行结果
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('datasets', 'analysis_results', 'chat_history')
ORDER BY table_name;
