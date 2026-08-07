/**
 * @webcontextinterface/react — declarative WCI annotation for React apps.
 * @packageDocumentation
 */

export { wciProps } from './props';
export type { WciAnnotation, WciDataAttributes } from './props';

export {
  WciScopeContext,
  useWciScope,
  useWciNode,
  useWciBridge,
  useWciView,
  useWciActions,
} from './hooks';
export type { UseWciBridgeResult, UseWciViewOptions } from './hooks';

export { Wci, WciLandmark, WciScope } from './components';
export type { WciProps, WciLandmarkProps, WciScopeProps } from './components';
