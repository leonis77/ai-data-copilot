/**
 * M1 Trusted Input — Schema index
 *
 * 所有 API 边界 schema 的单一入口。
 * 新增 schema 时请在此 re-export，避免散落在业务代码里。
 */

export { validateUploadRequest, type UploadRequestBody, type UploadSuccess, type UploadError } from "./upload";
export {
  validateAgentRequest,
  validateAgentResponse,
  type AgentRequestBody,
  type AgentApiResponse,
  type InlineDataset,
} from "./agent";
