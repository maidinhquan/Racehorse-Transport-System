// Sub-domain namespaces
export * as coreApi from './core';
export * as contractApi from './contracts';
export * as reviewApi from './reviews';
export * as trackingApiDomain from './tracking';
export * as handoverApiDomain from './handover';

// Core utilities
export * from './core';

// Domain Clients & APIs
export * from './contracts';
export { requestReviewApi } from './reviews';
export {
  trackingApi,
  flow4Api,
  trackingRequest,
  flow4Request,
  Flow4ApiError,
  TrackingApiError,
  flow4Endpoints,
  trackingEndpoints,
} from './tracking';
export type {
  TrackingRequestOptions,
  Flow4RequestOptions,
  Flow4OperationId,
  TrackingOperationId,
} from './tracking';

export {
  handoverApi,
  flow6Api,
  handoverRequest,
  flow6Request,
  Flow6ApiError,
  HandoverApiError,
  flow6Endpoints,
  handoverEndpoints,
} from './handover';
export type {
  HandoverRequestOptions,
  Flow6RequestOptions,
  Flow6OperationId,
  HandoverOperationId,
  HandoverEndpointDefinition,
  Flow6EndpointDefinition,
} from './handover';
