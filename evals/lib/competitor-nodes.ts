import { parseAnnotatedNodesForEval } from './contexts';

/** All annotated nodes marked data-wci-competitor="true". */
export function listCompetitorNodeIds(annotatedHtml: string): string[] {
  const { nodes } = parseAnnotatedNodesForEval(annotatedHtml, { skipHidden: true });
  return nodes.filter((n) => n.competitor).map((n) => n.id);
}
