const KEY = "aicopilot";

export interface AppStore {
  activeId: string;
  datasets: { id: string; originalName: string; rowCount: number; columns: string[]; createdAt: string }[];
  columnConfig: { datasetId: string; templateId?: string | null; selectedColumns: string[] } | null;
}

export function getStore(): AppStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { activeId: "", datasets: [], columnConfig: null };
    return JSON.parse(raw);
  } catch { return { activeId: "", datasets: [], columnConfig: null }; }
}

export function setStore(update: Partial<AppStore>): AppStore {
  const prev = getStore();
  const next = { ...prev, ...update };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function addDataset(id: string, name: string, rowCount: number, columns: string[]) {
  const s = getStore();
  s.datasets = s.datasets.filter(function(d) { return d.id !== id; });
  s.datasets.unshift({ id, originalName: name, rowCount, columns, createdAt: new Date().toISOString() });
  if (s.datasets.length > 5) s.datasets = s.datasets.slice(0, 5);
  s.activeId = id;
  s.columnConfig = null;
  setStore(s);
  return s;
}

export function removeDataset(id: string) {
  const s = getStore();
  s.datasets = s.datasets.filter(function(d) { return d.id !== id; });
  if (s.activeId === id) s.activeId = s.datasets.length > 0 ? s.datasets[0].id : "";
  setStore(s);
  return s;
}

export function saveColumnConfig(config: AppStore["columnConfig"]) {
  setStore({ columnConfig: config });
}

export function clearStore() {
  localStorage.removeItem(KEY);
}
