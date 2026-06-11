import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filename: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

interface StoredDataset {
  id: string;
  name: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
  createdAt: string;
}

interface StoredAnalysis {
  id: string;
  datasetId: string;
  summary: string;
  insights: string;
  risks: string;
  suggestions: string;
  createdAt: string;
}

interface StoredChatMessage {
  id: number;
  datasetId: string | null;
  role: string;
  content: string;
  createdAt: string;
}

function getDatasets(): StoredDataset[] {
  return readJson<StoredDataset[]>("datasets.json", []);
}

function setDatasets(datasets: StoredDataset[]) {
  writeJson("datasets.json", datasets);
}

function getAnalyses(): StoredAnalysis[] {
  return readJson<StoredAnalysis[]>("analyses.json", []);
}

function setAnalyses(analyses: StoredAnalysis[]) {
  writeJson("analyses.json", analyses);
}

function getChatMessages(): StoredChatMessage[] {
  return readJson<StoredChatMessage[]>("chat_messages.json", []);
}

function setChatMessages(messages: StoredChatMessage[]) {
  writeJson("chat_messages.json", messages);
}

export function saveDataset(data: {
  id: string;
  name: string;
  originalName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  summary: string;
}) {
  const datasets = getDatasets();
  const idx = datasets.findIndex((d) => d.id === data.id);
  const entry: StoredDataset = {
    ...data,
    rowCount: data.rows.length,
    createdAt: new Date().toISOString(),
  };
  if (idx >= 0) datasets[idx] = entry;
  else datasets.push(entry);
  setDatasets(datasets);
}

export function getDataset(id: string): StoredDataset | null {
  return getDatasets().find((d) => d.id === id) || null;
}

export function getLatestDataset(): StoredDataset | null {
  const datasets = getDatasets();
  if (datasets.length === 0) return null;
  return datasets.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  );
}

export function saveAnalysis(data: {
  id: string;
  datasetId: string;
  summary: string;
  insights: string;
  risks: string;
  suggestions: string;
}) {
  const analyses = getAnalyses();
  const idx = analyses.findIndex((a) => a.id === data.id);
  const entry: StoredAnalysis = { ...data, createdAt: new Date().toISOString() };
  if (idx >= 0) analyses[idx] = entry;
  else analyses.push(entry);
  setAnalyses(analyses);
}

export function getAnalysis(datasetId: string): StoredAnalysis | null {
  const analyses = getAnalyses();
  const relevant = analyses
    .filter((a) => a.datasetId === datasetId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return relevant[0] || null;
}

export function saveChatMessage(datasetId: string | null, role: string, content: string) {
  const messages = getChatMessages();
  const id = messages.length > 0 ? Math.max(...messages.map((m) => m.id)) + 1 : 1;
  messages.push({ id, datasetId, role, content, createdAt: new Date().toISOString() });
  setChatMessages(messages);
}

export function getChatHistory(datasetId: string | null, limit = 50): StoredChatMessage[] {
  const messages = getChatMessages();
  return messages
    .filter((m) => m.datasetId === datasetId)
    .slice(-limit);
}
