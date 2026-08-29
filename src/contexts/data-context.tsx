"use client";

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, type ReactNode } from "react";
import type { DecisionChainResponse, InsufficientDataResponse } from "@/lib/agent/api-types";
import type { Decision, Execution, Outcome } from "@/lib/loop/types";
import type { LocalDatasetMeta } from "@/lib/store";
import type { PrioritizedAction } from "@/lib/pipeline/types";

// ═══════════════════════════════════════════════
// Event Bus
// ═══════════════════════════════════════════════

type EventName =
  | "dataset:changed"
  | "dataset:rows:updated"
  | "analysis:completed"
  | "analysis:error"
  | "execution:started"
  | "execution:completed"
  | "outcome:saved"
  | "loop:refreshed"
  | "decision:updated";

type EventCallback = (payload: Record<string, unknown>) => void;

class DataEventEmitter {
  private listeners: Map<EventName, Set<EventCallback>> = new Map();
  private globalListeners: Set<EventCallback> = new Set();

  on(event: EventName, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  onAny(callback: EventCallback): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  off(event: EventName, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: EventName, payload: Record<string, unknown> = {}): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[DataEventEmitter] Error in listener for ${event}:`, e);
        }
      });
    }
    this.globalListeners.forEach((cb) => {
      try {
        cb({ event, ...payload });
      } catch (e) {
        console.error(`[DataEventEmitter] Error in global listener:`, e);
      }
    });
  }

  removeAllListeners(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.globalListeners.clear();
    }
  }
}

export const dataEventBus = new DataEventEmitter();

// ═══════════════════════════════════════════════
// State Types
// ═══════════════════════════════════════════════

export interface DatasetState {
  activeDatasetId: string | null;
  datasets: LocalDatasetMeta[];
  datasetRows: Record<string, { columns: string[]; rows: Record<string, unknown>[] }>;
}

export interface AnalysisState {
  rawData: { columns: string[]; rows: Record<string, unknown>[]; original_name: string } | null;
  decisionChain: DecisionChainResponse | null;
  insufficientData: InsufficientDataResponse | null;
  stats: ReturnType<typeof import("@/lib/store").computeStatsCached> | null;
  agentLoading: boolean;
  pipelineError: string | null;
  degradedResponse: boolean;
}

export interface LoopState {
  rows: {
    decision: Decision;
    actionTasks: PrioritizedAction[];
    executions: Record<string, Execution[]>;
    outcomes: Record<string, Outcome[]>;
  }[];
  loopLoading: boolean;
  loopError: string | null;
}

export interface UiState {
  loading: boolean;
  error: Error | null;
}

export interface DataState {
  dataset: DatasetState;
  analysis: AnalysisState;
  loop: LoopState;
  ui: UiState;
}

// ═══════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════

type DataAction =
  // Dataset actions
  | { type: "SET_ACTIVE_DATASET"; payload: string | null }
  | { type: "SET_DATASETS"; payload: LocalDatasetMeta[] }
  | { type: "SET_DATASET_ROWS"; payload: { id: string; columns: string[]; rows: Record<string, unknown>[] } }
  // Analysis actions
  | { type: "SET_RAW_DATA"; payload: { columns: string[]; rows: Record<string, unknown>[]; original_name: string } | null }
  | { type: "SET_DECISION_CHAIN"; payload: DecisionChainResponse | null }
  | { type: "SET_INSUFFICIENT_DATA"; payload: InsufficientDataResponse | null }
  | { type: "SET_STATS"; payload: ReturnType<typeof import("@/lib/store").computeStatsCached> | null }
  | { type: "SET_AGENT_LOADING"; payload: boolean }
  | { type: "SET_PIPELINE_ERROR"; payload: string | null }
  | { type: "SET_DEGRADED_RESPONSE"; payload: boolean }
  // Loop actions
  | { type: "SET_LOOP_DATA"; payload: {
      rows: DataState["loop"]["rows"];
      loading: boolean;
      error: string | null;
    } }
  | { type: "UPDATE_EXECUTION"; payload: { actionTaskId: string; execution: Execution } }
  | { type: "UPDATE_OUTCOME"; payload: { actionTaskId: string; outcome: Outcome } }
  // UI actions
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: Error | null }
  | { type: "RESET" };

// ═══════════════════════════════════════════════
// Reducer
// ═══════════════════════════════════════════════

const initialState: DataState = {
  dataset: {
    activeDatasetId: null,
    datasets: [],
    datasetRows: {},
  },
  analysis: {
    rawData: null,
    decisionChain: null,
    insufficientData: null,
    stats: null,
    agentLoading: false,
    pipelineError: null,
    degradedResponse: false,
  },
  loop: {
    rows: [],
    loopLoading: false,
    loopError: null,
  },
  ui: {
    loading: true,
    error: null,
  },
};

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    // Dataset actions
    case "SET_ACTIVE_DATASET":
      return {
        ...state,
        dataset: { ...state.dataset, activeDatasetId: action.payload },
      };

    case "SET_DATASETS":
      return {
        ...state,
        dataset: { ...state.dataset, datasets: action.payload },
      };

    case "SET_DATASET_ROWS": {
      const { id, columns, rows } = action.payload;
      return {
        ...state,
        dataset: {
          ...state.dataset,
          datasetRows: {
            ...state.dataset.datasetRows,
            [id]: { columns, rows },
          },
        },
      };
    }

    // Analysis actions
    case "SET_RAW_DATA":
      return {
        ...state,
        analysis: { ...state.analysis, rawData: action.payload },
      };

    case "SET_DECISION_CHAIN":
      return {
        ...state,
        analysis: { ...state.analysis, decisionChain: action.payload },
      };

    case "SET_INSUFFICIENT_DATA":
      return {
        ...state,
        analysis: { ...state.analysis, insufficientData: action.payload },
      };

    case "SET_STATS":
      return {
        ...state,
        analysis: { ...state.analysis, stats: action.payload },
      };

    case "SET_AGENT_LOADING":
      return {
        ...state,
        analysis: { ...state.analysis, agentLoading: action.payload },
      };

    case "SET_PIPELINE_ERROR":
      return {
        ...state,
        analysis: { ...state.analysis, pipelineError: action.payload },
      };

    case "SET_DEGRADED_RESPONSE":
      return {
        ...state,
        analysis: { ...state.analysis, degradedResponse: action.payload },
      };

    // Loop actions
    case "SET_LOOP_DATA":
      return {
        ...state,
        loop: {
          rows: action.payload.rows,
          loopLoading: action.payload.loading,
          loopError: action.payload.error,
        },
      };

    case "UPDATE_EXECUTION": {
      const { actionTaskId, execution } = action.payload;
      if (!actionTaskId) return state;
      return {
        ...state,
        loop: {
          ...state.loop,
          rows: state.loop.rows.map((row) => {
            if (!row.actionTasks.some((t) => t.actionTaskId === actionTaskId)) {
              return row;
            }
            const taskExecutions = row.executions[actionTaskId] || [];
            const existingIndex = taskExecutions.findIndex((e) => e.id === execution.id);
            let newExecutions: Execution[];
            if (existingIndex >= 0) {
              newExecutions = [...taskExecutions];
              newExecutions[existingIndex] = execution;
            } else {
              newExecutions = [...taskExecutions, execution];
            }
            return {
              ...row,
              executions: {
                ...row.executions,
                [actionTaskId]: newExecutions,
              },
            };
          }),
        },
      };
    }

    case "UPDATE_OUTCOME": {
      const { actionTaskId, outcome } = action.payload;
      return {
        ...state,
        loop: {
          ...state.loop,
          rows: state.loop.rows.map((row) => {
            if (!row.actionTasks.some((t) => t.actionTaskId === actionTaskId)) {
              return row;
            }
            const taskOutcomes = row.outcomes[actionTaskId] || [];
            const newOutcomes = [...taskOutcomes, outcome];
            return {
              ...row,
              outcomes: {
                ...row.outcomes,
                [actionTaskId]: newOutcomes,
              },
            };
          }),
        },
      };
    }

    // UI actions
    case "SET_LOADING":
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload },
      };

    case "SET_ERROR":
      return {
        ...state,
        ui: { ...state.ui, error: action.payload },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════

export interface DataContextValue {
  state: DataState;
  dispatch: React.Dispatch<DataAction>;
  eventBus: typeof dataEventBus;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useDataContext must be used within DataProvider");
  }
  return ctx;
}

// ═══════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════

interface DataProviderProps {
  children: ReactNode;
  userId: string;
}

export function DataProvider({ children, userId }: DataProviderProps) {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const initializedRef = useRef(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const { getStore } = require("@/lib/store");
      const store = getStore(userId);

      if (store.activeId) {
        dispatch({ type: "SET_ACTIVE_DATASET", payload: store.activeId });
      }
      if (store.datasets && store.datasets.length > 0) {
        dispatch({ type: "SET_DATASETS", payload: store.datasets });
      }
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (e) {
      console.error("[DataProvider] Failed to initialize from localStorage:", e);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [userId]);

  // Listen for dataset changes and invalidate caches
  useEffect(() => {
    const unsubscribe = dataEventBus.on("dataset:changed", (payload) => {
      const { datasetId } = payload as { datasetId: string };
      dispatch({ type: "SET_ACTIVE_DATASET", payload: datasetId });
      // Clear analysis cache when dataset changes
      dispatch({ type: "SET_DECISION_CHAIN", payload: null });
      dispatch({ type: "SET_INSUFFICIENT_DATA", payload: null });
      dispatch({ type: "SET_PIPELINE_ERROR", payload: null });
      dispatch({ type: "SET_RAW_DATA", payload: null });
      dispatch({ type: "SET_STATS", payload: null });
      // Clear loop data for old dataset
      dispatch({
        type: "SET_LOOP_DATA",
        payload: { rows: [], loading: false, error: null },
      });
    });

    return unsubscribe;
  }, []);

  const contextValue = React.useMemo(
    () => ({
      state,
      dispatch,
      eventBus: dataEventBus,
    }),
    [state]
  );

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
}
