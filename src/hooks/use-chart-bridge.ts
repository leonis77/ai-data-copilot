"use client";

import { useState, useCallback, useMemo } from "react";
import type { EvidenceCard, PrioritizedAction } from "@/lib/pipeline/types";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type DataPointType = "product" | "category" | "region" | "date" | "anomaly";

export interface DataPoint {
  type: DataPointType;
  label: string;
  value: number;
  rawValue?: any;
  meta?: Record<string, unknown>;
}

export interface DataPointState {
  selected: DataPoint | null;
  relatedCards: EvidenceCard[];
  relatedActions: PrioritizedAction[];
  isPanelOpen: boolean;
}

export type DataPointAction =
  | { type: "SELECT"; payload: DataPoint }
  | { type: "CLEAR" }
  | { type: "SET_RELATED"; payload: { cards: EvidenceCard[]; actions: PrioritizedAction[] } }
  | { type: "OPEN_PANEL" }
  | { type: "CLOSE_PANEL" };

// ═══════════════════════════════════════════════
// Hook: useChartBridge
// ═══════════════════════════════════════════════

export function useChartBridge() {
  const [state, setState] = useState<DataPointState>({
    selected: null,
    relatedCards: [],
    relatedActions: [],
    isPanelOpen: false,
  });

  const selectDataPoint = useCallback((point: DataPoint, cards: EvidenceCard[], actions: PrioritizedAction[]) => {
    setState({
      selected: point,
      relatedCards: cards,
      relatedActions: actions,
      isPanelOpen: true,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState(function(prev) {
      return {
        ...prev,
        selected: null,
        relatedCards: [],
        relatedActions: [],
        isPanelOpen: false,
      };
    });
  }, []);

  const setRelated = useCallback((cards: EvidenceCard[], actions: PrioritizedAction[]) => {
    setState(function(prev) {
      return {
        ...prev,
        relatedCards: cards,
        relatedActions: actions,
      };
    });
  }, []);

  return {
    selected: state.selected,
    relatedCards: state.relatedCards,
    relatedActions: state.relatedActions,
    isPanelOpen: state.isPanelOpen,
    selectDataPoint: selectDataPoint,
    clearSelection: clearSelection,
    setRelated: setRelated,
  };
}

// ═══════════════════════════════════════════════
// Helper: find related actions by data point
// ═══════════════════════════════════════════════

export function findRelatedActions(
  point: DataPoint,
  evidenceCards: EvidenceCard[],
  actions: PrioritizedAction[]
): { cards: EvidenceCard[]; actions: PrioritizedAction[] } {
  if (!point) return { cards: [], actions: [] };

  var label = point.label.toLowerCase();
  var matchedCards: EvidenceCard[] = [];
  var matchedActionIndices = new Set<number>();

  // Match by product name, category, region, or date
  for (var i = 0; i < evidenceCards.length; i++) {
    var card = evidenceCards[i];
    var cardProduct = (card.productName || "").toLowerCase();
    var cardPlatform = (card.platform || "").toLowerCase();

    if (point.type === "product" && cardProduct.indexOf(label) >= 0) {
      matchedCards.push(card);
      // Collect action indices related to this card
    } else if (point.type === "category" && cardProduct.indexOf(label) >= 0) {
      matchedCards.push(card);
    } else if (point.type === "region" && cardPlatform.indexOf(label) >= 0) {
      matchedCards.push(card);
    }
  }

  // Find actions related to matched cards
  var cardIndices = new Set(matchedCards.map(function(c) { return c.cardIndex; }));
  for (var j = 0; j < actions.length; j++) {
    var action = actions[j];
    var refs = action.evidenceRefs || [];
    for (var k = 0; k < refs.length; k++) {
      if (cardIndices.has(refs[k])) {
        matchedActionIndices.add(j);
        break;
      }
    }
    // Also match by target text
    if ((action.target || "").toLowerCase().indexOf(label) >= 0) {
      matchedActionIndices.add(j);
    }
  }

  var matchedActions = Array.from(matchedActionIndices).map(function(idx) { return actions[idx]; });

  // If no direct matches, return top 2 actions as fallback
  if (matchedCards.length === 0 && matchedActions.length === 0 && actions.length > 0) {
    matchedActions = actions.slice(0, 2);
  }

  return { cards: matchedCards, actions: matchedActions };
}

// ═══════════════════════════════════════════════
// Chart event helpers
// ═══════════════════════════════════════════════

export function createChartClickHandler(
  type: DataPointType,
  bridge: ReturnType<typeof useChartBridge>,
  evidenceCards: EvidenceCard[],
  actions: PrioritizedAction[]
) {
  return function(params: any) {
    if (!params || params.componentType !== "series") return;
    var name = params.name || "";
    var value = params.value || 0;
    var point: DataPoint = { type: type, label: name, value: value };
    var related = findRelatedActions(point, evidenceCards, actions);
    bridge.selectDataPoint(point, related.cards, related.actions);
  };
}
