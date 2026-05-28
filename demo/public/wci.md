# ExampleShop Demo — Agent Context

> This document is intended for LLM-based agents operating on ExampleShop Demo.
> Human users: see `about` instead.

## What This Site Does

ExampleShop is a demo e-commerce platform built to showcase the WCI framework.
You can browse a registration form, interact with it, and observe live agent-friendly output.

## What You Are Allowed To Do

- Fill and submit the registration form (scope: `registration-form`).
- Read product information.
- Add items to the cart (no auth required).
- Create a new user account at `register`.

## What You Are NOT Allowed To Do

- Access `admin-panel`, `user-settings-billing`, or `internal-debug` scopes.
- Perform checkout without explicit user confirmation.
- Store or log any payment card data.

## Authentication

- Registration, browsing: no auth required.
- Checkout requires session login via `login-form` at `login`.

## Task Flow: Register an Account

1. Navigate to the demo page (scope: `registration-form`).
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
- Violations → HTTP 429 + `Retry-After` header.

## Errors & Recovery

| Code | Meaning | Recovery |
|---|---|---|
| `VALIDATION_FAILED` | Field value invalid | Read `error.hint` and retry |
| `PRECONDITION_UNMET` | Guard not satisfied | Resolve preconditions first |
| `AUTH_REQUIRED` | Session missing/expired | Re-run auth flow at `login` |
| `SCOPE_DENIED` | Scope on deny list | Stop; inform the user |
| `NODE_NOT_FOUND` | Node ID not in DOM | Verify ID against distilled view |

## Contact

agents@wci.dev
