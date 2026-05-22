/**
 * @wci/core — WCI SDK (spec, distiller, bridge, context)
 * @packageDocumentation
 */

export * from '@wci/spec';

export {
  WciDistiller,
  pruneDOM,
  serializeJSON,
  serializeMarkdown,
} from '@wci/distiller';
export type { DistillerFormat, DistillerOptions } from '@wci/distiller';

export { WciBridge, dispatchAction } from '@wci/bridge';
export type {
  ActionRequest,
  ActionResult,
  SideEffect,
  ActionError,
  StateChangeHandler,
} from '@wci/bridge';

export {
  WciContextLoader,
  PolicyEngine,
  ScopeDeniedError,
} from '@wci/context';
export type { SiteContext } from '@wci/context';
