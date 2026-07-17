/**
 * M2 Unified Error Handling — index
 */

export {
  ApiErrorCode,
  type ApiErrorCode as ApiErrorCodeType,
  apiError,
  ok,
  zodErrorToDetails,
  type ApiErrorEnvelope,
} from "./api-error";

export {
  parseApiError,
  isAppApiError,
  type AppApiError,
} from "./client";
