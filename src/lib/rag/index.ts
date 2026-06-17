export { searchKnowledge } from "./knowledge";
export { injectKnowledgeSync } from "./inject";
export { injectRAG } from "./inject";
export type { RAGContext } from "./inject";
export { getIndustryKnowledge } from "./knowledge-base";
export { computeUserBenchmarks, saveUserBenchmarks, getUserHistory, formatHistoryForPrompt } from "./user-benchmarks";
export type { Benchmark, BenchmarkComparison } from "./user-benchmarks";
export { tokenize, jaccardSimilarity, searchByTokens } from "./matcher";
