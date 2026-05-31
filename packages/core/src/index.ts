/**
 * @webcontextinterface/core — WCI SDK (spec, distiller, bridge, context)
 * @packageDocumentation
 */

export * from '@webcontextinterface/spec';

export {
  WciDistiller,
  pruneDOM,
  serializeJSON,
  serializeMarkdown,
} from '@webcontextinterface/distiller';
export type { DistillerFormat, DistillerOptions } from '@webcontextinterface/distiller';

export { WciBridge, dispatchAction } from '@webcontextinterface/bridge';
export {
  resolveScopeId,
  enforcePolicyForDispatch,
  checkPolicyBeforeDispatch,
} from '@webcontextinterface/bridge';
export type {
  ActionRequest,
  ActionResult,
  SideEffect,
  ActionError,
  StateChangeHandler,
  WciBridgeOptions,
} from '@webcontextinterface/bridge';

export {
  WciContextLoader,
  PolicyEngine,
  ScopeDeniedError,
} from '@webcontextinterface/context';
export type { SiteContext } from '@webcontextinterface/context';
