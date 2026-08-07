-- ============================================================
-- ProcureWise Supabase Schema v3 (with User Isolation)
-- 在 Supabase SQL Editor 中执行全部内容
-- https://supabase.com/dashboard → 选择项目 → SQL Editor
-- ============================================================

-- 1. 创建数据表（含 user_id）
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
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
  user_id TEXT NOT NULL DEFAULT '',
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  summary TEXT,
  insights JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  dataset_id TEXT REFERENCES datasets(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_datasets_user_created ON datasets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user ON analysis_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at ASC);

-- 3. RLS 配置 — 启用行级安全
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略
CREATE POLICY "Users can view own datasets" ON datasets FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert own datasets" ON datasets FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own datasets" ON datasets FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own datasets" ON datasets FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can view own analysis_results" ON analysis_results FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert own analysis_results" ON analysis_results FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own analysis_results" ON analysis_results FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own analysis_results" ON analysis_results FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can view own chat_history" ON chat_history FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert own chat_history" ON chat_history FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own chat_history" ON chat_history FOR DELETE USING (user_id = auth.uid()::text);

-- 5. 验证
SELECT table_name, rowsecurity as rls_enabled
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('datasets', 'analysis_results', 'chat_history')
ORDER BY table_name;
