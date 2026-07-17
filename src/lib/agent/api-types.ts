import type { DecisionChain } from "@/lib/pipeline/types";
import type { AgentResponse } from "./types";

export interface DecisionChainResponse extends DecisionChain {
  type: "decision_chain";
  content: string;
  crossPlatform: NonNullable<DecisionChain["crossPlatform"]>;
}

export interface InsufficientDataResponse {
  type: "insufficient_data";
  content: string;
  limitations: string[];
  recoverable: true;
}

export interface FallbackAgentResponse extends AgentResponse {
  degraded: true;
  fallbackReason: string;
}

export interface AgentErrorResponse {
  type: "agent_error";
  content: string;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export type AgentApiResponse =
  | DecisionChainResponse
  | InsufficientDataResponse
  | FallbackAgentResponse
  | AgentErrorResponse;

export function serializeDecisionChain(chain: DecisionChain): DecisionChainResponse {
  return {
    type: "decision_chain",
    content: chain.aiExplanation.summary,
    ...chain,
    crossPlatform: chain.crossPlatform || chain.metrics.crossPlatform || [],
  };
}
