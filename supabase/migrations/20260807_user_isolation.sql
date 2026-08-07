-- ============================================================
-- User Data Isolation Migration
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

-- ═══ 1. 添加 user_id 列（允许 NULL 以便回填）═══

ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.analysis_results ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.action_tasks ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.executions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.outcomes ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ═══ 2. 回填现有数据 ═══
-- 将已有数据的 user_id 设为最近注册的用户。
-- 如果尚无用户，user_id 保持 NULL（RLS 会隐藏这些行，属正常行为）。

UPDATE public.datasets SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.analysis_results SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.chat_history SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.analysis_runs SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.decisions SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.action_tasks SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.executions SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;
UPDATE public.outcomes SET user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1) WHERE user_id IS NULL;

-- ═══ 3. 创建索引 ═══

CREATE INDEX IF NOT EXISTS idx_datasets_user ON public.datasets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user ON public.analysis_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON public.chat_history(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_user ON public.analysis_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_user ON public.decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_tasks_user ON public.action_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_user ON public.executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_user ON public.outcomes(user_id, created_at DESC);

-- ═══ 4. 启用 RLS ═══

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;

-- ═══ 5. RLS 策略 — datasets ═══

DROP POLICY IF EXISTS "Allow all on datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE USING (auth.uid()::text = user_id);

-- ═══ 6. RLS 策略 — analysis_results ═══

DROP POLICY IF EXISTS "Allow all on analysis_results" ON public.analysis_results;
CREATE POLICY "Users can view own analysis_results" ON public.analysis_results FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own analysis_results" ON public.analysis_results FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own analysis_results" ON public.analysis_results FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own analysis_results" ON public.analysis_results FOR DELETE USING (auth.uid()::text = user_id);

-- ═══ 7. RLS 策略 — chat_history ═══

DROP POLICY IF EXISTS "Allow all on chat_history" ON public.chat_history;
CREATE POLICY "Users can view own chat_history" ON public.chat_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own chat_history" ON public.chat_history FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own chat_history" ON public.chat_history FOR DELETE USING (auth.uid()::text = user_id);

-- ═══ 8. RLS 策略 — analysis_runs ═══

CREATE POLICY "Users can view own analysis_runs" ON public.analysis_runs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own analysis_runs" ON public.analysis_runs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ═══ 9. RLS 策略 — decisions ═══

CREATE POLICY "Users can view own decisions" ON public.decisions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own decisions" ON public.decisions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own decisions" ON public.decisions FOR UPDATE USING (auth.uid()::text = user_id);

-- ═══ 10. RLS 策略 — action_tasks ═══

CREATE POLICY "Users can view own action_tasks" ON public.action_tasks FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own action_tasks" ON public.action_tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own action_tasks" ON public.action_tasks FOR UPDATE USING (auth.uid()::text = user_id);

-- ═══ 11. RLS 策略 — executions ═══

CREATE POLICY "Users can view own executions" ON public.executions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own executions" ON public.executions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own executions" ON public.executions FOR UPDATE USING (auth.uid()::text = user_id);

-- ═══ 12. RLS 策略 — outcomes ═══

CREATE POLICY "Users can view own outcomes" ON public.outcomes FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own outcomes" ON public.outcomes FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ═══ 13. RLS 策略 — profiles（用户资料表）═══

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);

-- ═══ 14. 验证 ═══

SELECT table_name, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND table_name IN ('datasets','analysis_results','chat_history','analysis_runs','decisions','action_tasks','executions','outcomes','user_benchmarks')
ORDER BY table_name;
