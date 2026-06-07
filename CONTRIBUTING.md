# Contributing to Web Context Interface (WCI)

First off, thank you for taking the time to contribute! 🎉 Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

To maintain a clean repository history, high code quality, and smooth collaboration, we follow a set of guidelines. Please read through them before submitting your contributions.

---

## 🗺️ Table of Contents
1. [Code of Conduct](#-code-of-conduct)
2. [Branch Naming Conventions](#-branch-naming-conventions)
3. [Structured Commit Principles](#-structured-commit-principles)
4. [Local Development Guide](#-local-development-guide)
5. [Pull Request Guidelines](#-pull-request-guidelines)

---

## 🤝 Code of Conduct

We aim to foster an open, welcoming, and respectful community. We expect all contributors to adhere to professional conduct, engage in constructive feedback, and treat others with respect.

---

## 🌿 Branch Naming Conventions

When starting on a new contribution, create a branch from `main` using the following prefix structure:

| Branch Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feat/` | Introducing new features | `feat/custom-distiller-serializer` |
| `fix/` | Fixing bugs | `fix/bridge-policy-bypass` |
| `docs/` | Documentation additions or edits | `docs/update-action-spec` |
| `refactor/` | Code structure improvements (no new feature or fix) | `refactor/distiller-pruner` |
| `perf/` | Code changes that specifically focus on performance | `perf/speed-up-node-checks` |
| `test/` | Adding or updating tests | `test/add-bridge-unit-tests` |
| `chore/` | Maintenance tasks, configuration, or dependency updates | `chore/update-typescript-version` |

---

## ✍️ Structured Commit Principles

We use **Conventional Commits v1.0.0** to ensure our commit messages are easy to parse, search, and automate (e.g., for automated changelogs).

### Commit Message Structure

Every commit message must follow this structure:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

> [!IMPORTANT]
> A `!` can be added after the type or scope to draw attention to a breaking change (e.g., `feat(bridge)!: remove deprecated API`).

### Allowed Types (`<type>`)

*   **`feat`**: A new feature (corresponds to `MINOR` in semantic versioning).
*   **`fix`**: A bug fix (corresponds to `PATCH` in semantic versioning).
*   **`docs`**: Documentation changes only.
*   **`style`**: Formatting changes (white-space, formatting, semi-colons, etc.) that do not affect code behavior.
*   **`refactor`**: Code changes that neither fix a bug nor add a feature.
*   **`perf`**: A change that improves execution speed or memory efficiency.
*   **`test`**: Adding new tests or fixing existing ones.
*   **`build`**: Changes to the build system, packaging, or npm dependencies.
*   **`ci`**: CI/CD pipeline changes (GitHub Actions, workflows).
*   **`chore`**: Housekeeping, release versions, or configurations that do not modify source or test files.
*   **`revert`**: Reverts a previous commit.

### Workspace Scopes (`<scope>`)

Scopes should match the monorepo workspace packages or component areas:
*   `spec` - For `@webcontextinterface/spec` package
*   `distiller` - For `@webcontextinterface/distiller` package
*   `bridge` - For `@webcontextinterface/bridge` package
*   `context` - For `@webcontextinterface/context` package
*   `core` - For `@webcontextinterface/core` sdk
*   `demo` - For the demo site and application
*   `docs` - For VitePress documentation files
*   `evals` - For benchmark / evaluation harnesses

*If a commit affects multiple packages or the entire repo, the scope may be omitted.*

### Writing the Description (`<description>`)

1.  **Use the imperative mood**: "add action handler" instead of "added action handler" or "adds action handler".
2.  **No capitalization**: Start the description with a lowercase letter.
3.  **No punctuation**: Do not put a period (`.`) at the end of the description.

### Optional Body and Footer

*   **Body**: Provide a detailed description of the changes. Break lines at 72 characters. Contrast the change with the previous behavior.
*   **Footer**: List any breaking changes, deprecation notices, or link to relevant GitHub issue numbers.
    *   *Examples:* `Closes #42` or `Refs: #18`.
    *   *Breaking changes:* Must start with the text `BREAKING CHANGE: ` followed by a space or newline.

### Commit Examples

```text
feat(distiller): support markdown custom serializer options
```

```text
fix(bridge): enforce rate limits correctly in click handlers

Ensure click actions respect the configured throttle limit in wci.txt.
Closes #105
```

```text
feat(core)!: rename core export module

BREAKING CHANGE: the old module export name has been replaced by WciCoreSDK.
```

---

## 💻 Local Development Guide

### Setup

1.  Fork and clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Available Scripts

Run the following commands from the workspace root:

*   **Build all packages:** `npm run build`
*   **Lint checks:** `npm run lint`
*   **Run local VitePress Docs:** `npm run docs:dev` (runs at http://localhost:5174)
*   **Run local interactive Demo:** `npm run demo` (runs at http://localhost:5173)

### Running Benchmark / Evaluations

If your changes modify distillation or grounding behavior, please verify them using the evaluation scripts:
```bash
# Verify evaluation harness
npm run eval:verify

# Run multi-step evaluations
npm run eval:multistep -- --models=gpt5Nano --scenarios=flight-booking
```

---

## 🚀 Pull Request Guidelines

Before submitting your Pull Request, run through the following checklist:

1.  **Follow the Commit Guidelines**: Make sure your branch commits are clean and follow Conventional Commits.
2.  **Pass Checks**: Ensure `npm run lint` and `npm run build` pass without any warnings or errors.
3.  **Document Your Changes**: Update relevant guides in the `docs/` folder or update JSDoc comments if your PR introduces new APIs or changes existing specs.
4.  **Reference Issues**: Use GitHub keywords to link the PR to the relevant issue (e.g. `Closes #123` in the PR description).
5.  **Clean Git History**: Rebase and squash minor/fixup commits before requesting review if necessary.
