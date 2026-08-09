/**
 * @webcontextinterface/annotator — derive WCI annotations from plain HTML.
 * @packageDocumentation
 */

export { inferAnnotations } from './infer';
export type { InferOptions, InferredNode, InferenceReport } from './infer';
export { applyInferredAnnotations, inferView } from './apply';
export type { ApplyOptions, ApplyResult } from './apply';
