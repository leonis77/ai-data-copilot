import { beforeEach, describe, expect, it } from "vitest";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/store";

function createLocalStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
    key(index: number) { return Array.from(values.keys())[index] || null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(key, String(value)); },
  };
}

describe("analysis cache persistence", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorage(),
    });
  });

  it("survives a store read after being written", () => {
    const userId = "user-cache-test";
    const datasetId = "dataset-cache-test";
    const response = { type: "decision_chain", content: "cached analysis" };

    setAnalysisCache(userId, datasetId, response, "dashboard", "v1_data");

    expect(getAnalysisCache(userId, datasetId, "dashboard", "v1_data")).toEqual({
      datasetId,
      cachedAt: expect.any(Number),
      data: response,
      dataVersion: "v1_data",
    });
  });
});
