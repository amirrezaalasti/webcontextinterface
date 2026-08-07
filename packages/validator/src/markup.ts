// ─────────────────────────────────────────────────────────────────────────────
// WCI Validator — data-wci-* markup rules
// ─────────────────────────────────────────────────────────────────────────────

import {
  MAX_WCI_PRIORITY,
  MIN_WCI_PRIORITY,
  VALID_WCI_ACTIONS,
  VALID_WCI_ROLES,
  isCheckableElement,
  isElement,
  isFileInputElement,
  isFormElement,
  isSelectElement,
  isTextEntryElement,
  type WciAction,
} from '@webcontextinterface/spec';
import { buildReport, type ValidateOptions, type ValidationIssue, type ValidationReport } from './types';

/** Every attribute the spec defines, in `dataset` camelCase form. */
const KNOWN_DATASET_KEYS = new Set([
  'wciId', 'wciRole', 'wciDesc', 'wciAction', 'wciState', 'wciPrecondition',
  'wciRequired', 'wciOptions', 'wciEmit', 'wciScope', 'wciHidden', 'wciPriority',
]);

/** Which elements each action verb can legitimately drive. */
const ACTION_ELEMENT_RULES: Partial<Record<WciAction, {
  matches: (el: Element) => boolean;
  expected: string;
}>> = {
  fill: {
    matches: isTextEntryElement,
    expected: '<input> or <textarea>',
  },
  select: {
    matches: isSelectElement,
    expected: '<select>',
  },
  check: {
    matches: isCheckableElement,
    expected: '<input type="checkbox"> or <input type="radio">',
  },
  upload: {
    matches: isFileInputElement,
    expected: '<input type="file">',
  },
  submit: {
    matches: el => isFormElement(el) || el.closest('form') !== null,
    expected: 'a <form> or an element inside one',
  },
  navigate: {
    matches: el => el.hasAttribute('href'),
    expected: 'an element with an href attribute',
  },
};

/** A short, human-locatable path like `body > section:nth-child(2) > button`. */
function describePath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && depth < 4 && cur.tagName.toLowerCase() !== 'html') {
    const tag = cur.tagName.toLowerCase();
    const parent: Element | null = cur.parentElement;
    if (parent) {
      const idx = Array.from(parent.children).indexOf(cur) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
    } else {
      parts.unshift(tag);
    }
    cur = parent;
    depth += 1;
  }
  return parts.join(' > ');
}

/**
 * Lint every WCI-annotated element under `root`.
 *
 * The reader in @webcontextinterface/spec is deliberately forgiving — it
 * coerces bad input so a page never breaks at runtime. That is the wrong
 * behaviour at authoring time, so this walks the raw attributes instead and
 * reports what the reader would have silently repaired.
 */
export function validateMarkup(
  root: ParentNode,
  options: ValidateOptions = {},
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const minDesc = options.minDescLength ?? 10;

  // Project-specific extensions, normalised from `data-wci-foo` to the
  // camelCase key the DOM exposes on `dataset`.
  const allowedKeys = new Set(
    (options.allowAttributes ?? []).map(attr =>
      attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
    ),
  );

  const elements = Array.from(root.querySelectorAll('[data-wci-id],[data-wci-role]'));
  if (isElement(root) && root.matches('[data-wci-id],[data-wci-role]')) {
    elements.unshift(root);
  }

  if (elements.length === 0) {
    issues.push({
      level: 'warning',
      rule: 'empty-document',
      message: 'No data-wci-* annotated elements found.',
      hint: 'Add data-wci-id and data-wci-role to the elements an agent needs to see.',
    });
    return buildReport(issues, 0, options);
  }

  const seenIds = new Map<string, number>();
  const landmarkIds = new Set<string>();
  const declaredScopes = new Set<string>();

  // First pass — collect identity so cross-references can be checked after.
  for (const el of elements) {
    const ds = (el as HTMLElement).dataset;
    if (ds.wciId) {
      seenIds.set(ds.wciId, (seenIds.get(ds.wciId) ?? 0) + 1);
      if (ds.wciRole === 'landmark') landmarkIds.add(ds.wciId);
    }
    if (ds.wciScope) declaredScopes.add(ds.wciScope);
  }

  for (const [id, count] of seenIds) {
    if (count > 1) {
      issues.push({
        level: 'error',
        rule: 'duplicate-id',
        nodeId: id,
        message: `data-wci-id="${id}" appears ${count} times.`,
        hint: 'Node ids must be unique — the bridge dispatches to the first match, so duplicates make actions non-deterministic.',
      });
    }
  }

  // Second pass — per-element rules.
  for (const el of elements) {
    const html = el as HTMLElement;
    const ds = html.dataset;
    const id = ds.wciId;
    const path = describePath(el);
    const at = { nodeId: id, path };

    if (!id) {
      issues.push({
        ...at,
        level: 'error',
        rule: 'missing-id',
        message: `<${el.tagName.toLowerCase()}> has data-wci-role but no data-wci-id.`,
        hint: 'Without an id the node cannot be targeted by an action.',
      });
    }

    const role = ds.wciRole;
    if (role && !(VALID_WCI_ROLES as readonly string[]).includes(role)) {
      issues.push({
        ...at,
        level: 'error',
        rule: 'invalid-role',
        message: `Unknown role "${role}".`,
        hint: `Valid roles: ${VALID_WCI_ROLES.join(', ')}.`,
      });
    }

    if (role === 'landmark' && !id) {
      issues.push({
        ...at,
        level: 'error',
        rule: 'landmark-without-id',
        message: 'A landmark must carry a data-wci-id — it is the scope identifier.',
        hint: 'Give the landmark an id, then reference it from child data-wci-scope attributes.',
      });
    }

    const action = ds.wciAction;
    if (action && !(VALID_WCI_ACTIONS as readonly string[]).includes(action)) {
      issues.push({
        ...at,
        level: 'error',
        rule: 'invalid-action',
        message: `Unknown action "${action}".`,
        hint: `Valid actions: ${VALID_WCI_ACTIONS.join(', ')}.`,
      });
    }

    if (action && !role) {
      issues.push({
        ...at,
        level: 'warning',
        rule: 'action-without-role',
        message: `Node declares data-wci-action="${action}" but no data-wci-role.`,
        hint: 'Add data-wci-role="action" or "form" so the distiller categorises it correctly.',
      });
    }

    if (action && (VALID_WCI_ACTIONS as readonly string[]).includes(action)) {
      const rule = ACTION_ELEMENT_RULES[action as WciAction];
      if (rule && !rule.matches(el)) {
        issues.push({
          ...at,
          level: 'error',
          rule: 'action-element-mismatch',
          message: `Action "${action}" cannot apply to <${el.tagName.toLowerCase()}>.`,
          hint: `"${action}" expects ${rule.expected}; the bridge will return ACTION_NOT_SUPPORTED at runtime.`,
        });
      }
    }

    const desc = ds.wciDesc;
    if (!desc) {
      issues.push({
        ...at,
        level: 'warning',
        rule: 'missing-desc',
        message: 'No data-wci-desc — the distiller will fall back to raw text content.',
        hint: 'Write a description aimed at a model, e.g. "Submit order — charges the saved card".',
      });
    } else if (desc.trim().length < minDesc) {
      issues.push({
        ...at,
        level: 'warning',
        rule: 'weak-desc',
        message: `Description "${desc}" is too short to disambiguate this node.`,
        hint: `Aim for at least ${minDesc} characters describing purpose and effect.`,
      });
    }

    if (ds.wciState !== undefined) {
      try {
        const parsed: unknown = JSON.parse(ds.wciState);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          issues.push({
            ...at,
            level: 'error',
            rule: 'malformed-state',
            message: 'data-wci-state must be a JSON object.',
            hint: 'Use {"value":""} rather than an array or primitive; the reader discards anything else.',
          });
        }
      } catch {
        issues.push({
          ...at,
          level: 'error',
          rule: 'malformed-state',
          message: 'data-wci-state is not valid JSON.',
          hint: 'Remember HTML attributes need single quotes around JSON: data-wci-state=\'{"value":""}\'.',
        });
      }
    }

    if (ds.wciOptions !== undefined) {
      let ok = false;
      try {
        ok = Array.isArray(JSON.parse(ds.wciOptions));
      } catch { /* falls back to the comma-separated form */ }
      if (!ok && !ds.wciOptions.includes(',')) {
        issues.push({
          ...at,
          level: 'warning',
          rule: 'malformed-options',
          message: 'data-wci-options is neither a JSON array nor a comma-separated list.',
          hint: 'Use \'["a","b"]\' or "a, b".',
        });
      }
    }

    if (ds.wciPriority !== undefined) {
      const n = Number.parseInt(ds.wciPriority, 10);
      if (!Number.isFinite(n)) {
        issues.push({
          ...at,
          level: 'error',
          rule: 'invalid-priority',
          message: `data-wci-priority="${ds.wciPriority}" is not a number.`,
          hint: `Use an integer from ${MIN_WCI_PRIORITY} (highest) to ${MAX_WCI_PRIORITY} (lowest).`,
        });
      } else if (n < MIN_WCI_PRIORITY || n > MAX_WCI_PRIORITY) {
        issues.push({
          ...at,
          level: 'warning',
          rule: 'invalid-priority',
          message: `data-wci-priority="${n}" is outside ${MIN_WCI_PRIORITY}..${MAX_WCI_PRIORITY} and will be clamped.`,
          hint: `Use an integer from ${MIN_WCI_PRIORITY} (highest) to ${MAX_WCI_PRIORITY} (lowest).`,
        });
      }
    }

    if (ds.wciScope && !landmarkIds.has(ds.wciScope)) {
      issues.push({
        ...at,
        level: 'warning',
        rule: 'unknown-scope',
        message: `data-wci-scope="${ds.wciScope}" does not match any landmark id in this document.`,
        hint: 'Scoped distillation and wci.txt policy both key off landmark ids; a typo here silently drops the node.',
      });
    }

    if (ds.wciRequired !== undefined && role && role !== 'form') {
      issues.push({
        ...at,
        level: 'info',
        rule: 'required-without-form-role',
        message: `data-wci-required on a "${role}" node has no effect.`,
        hint: 'Only form nodes are treated as required inputs.',
      });
    }

    if (ds.wciOptions !== undefined && !(
      isSelectElement(el) || isCheckableElement(el)
    )) {
      issues.push({
        ...at,
        level: 'info',
        rule: 'options-without-choice-element',
        message: 'data-wci-options is set on an element that offers no choices.',
        hint: 'Options are meaningful on <select>, checkboxes, and radio groups.',
      });
    }

    if (ds.wciPrecondition !== undefined && !action) {
      issues.push({
        ...at,
        level: 'info',
        rule: 'precondition-without-action',
        message: 'data-wci-precondition on a node with no action is never evaluated.',
        hint: 'Add a data-wci-action, or move the note into data-wci-desc.',
      });
    }

    for (const key of Object.keys(ds)) {
      if (key.startsWith('wci') && !KNOWN_DATASET_KEYS.has(key) && !allowedKeys.has(key)) {
        const attr = `data-${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`;
        issues.push({
          ...at,
          level: 'warning',
          rule: 'unknown-attribute',
          message: `Unknown WCI attribute "${attr}".`,
          hint: 'Check the spelling against the specification; unknown attributes are ignored.',
        });
      }
    }
  }

  return buildReport(issues, elements.length, options);
}
