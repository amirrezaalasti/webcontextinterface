# WCI Demo — Agent Context

> This document is intended for LLM-based agents operating on the **WCI Demo** site.
> Human visitors: use the [documentation](/) or [live demo](/demo/).

## What This Site Does

The WCI Demo is the public home of the **Web Context Interface** standard. It includes:

- A **live registration form** with real-time distillation and typed agent actions
- A **DOM converter** that infers WCI-like views from pasted HTML
- **Benchmark results** comparing five context approaches across 50 scenarios
- A **scenario browser** with raw and annotated HTML previews

## What You Are Allowed To Do

- Fill and submit the registration form (scope: `registration-form`).
- Dispatch typed actions via `WciBridge` on the demo form.
- Parse pasted DOM snapshots in the converter (scope: `dom-converter`).
- Read benchmark charts and leaderboard data on the demo home page.
- Browse benchmark scenarios in the scenario viewer (scope: `scenarios-browser`).

## What You Are NOT Allowed To Do

- Access `admin-panel`, `internal-debug`, or `eval-config-raw` scopes.
- Assume e-commerce checkout or login flows exist on this demo site — those appear only inside benchmark scenario fixtures.
- Submit real credentials or PII — this is a local demo with no backend.

## Authentication

No authentication is required on the demo site. Benchmark scenario pages are static HTML fixtures loaded in iframes.

## Task Flow: Try the Live Demo

1. Navigate to the demo home (scope: `registration-form`).
2. Fill `email-input` with a valid email address.
3. Fill `password-input` (min 8 characters, 1 uppercase, 1 symbol).
4. Click `terms-checkbox` to accept Terms & Conditions.
5. Click `submit-btn` — **precondition**: all required fields must be valid and terms accepted.

## Key Concepts

- **Scope IDs** match `data-wci-id` on `<section data-wci-role="landmark">` elements.
- **ActionResults** carry exact before/after state diffs — do not re-parse the full DOM.
- **`data-wci-state`** is always current. Trust it over any cached snapshot.
- Check `precondition` on a node before dispatching any action.

## Rate Limits

- 60 actions/minute.
- 120 distil requests/minute.

## Errors & Recovery

| Code | Meaning | Recovery |
|---|---|---|
| `VALIDATION_FAILED` | Field value invalid | Read `error.hint` and retry |
| `PRECONDITION_UNMET` | Guard not satisfied | Resolve preconditions first |
| `SCOPE_DENIED` | Scope on deny list | Stop; inform the user |
| `NODE_NOT_FOUND` | Node ID not in DOM | Verify ID against distilled view |

## Benchmark Methodology

For a plain-language summary of the 50-scenario evaluation, see the [Benchmark overview](/benchmark). Full developer details live in [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md).

## Contact

agents@wci.dev
