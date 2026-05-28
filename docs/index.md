---
layout: home

hero:
  name: WCI
  text: Web Context Interface
  tagline: An open standard and TypeScript SDK that makes web pages natively readable and actionable for LLM-based agents — in under 8 KB per layer.
  image:
    src: /logo.png
    alt: WCI — Web Context Interface
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View Specification
      link: /specification
    - theme: alt
      text: Live Demo
      link: /demo/
    - theme: alt
      text: NotebookLM
      link: https://notebooklm.google.com/notebook/aa9fa965-4a1b-400d-a605-37f0632c2738
      target: _blank

features:
  - icon: 🏷️
    title: Semantic HTML
    details: Extend standard HTML with data-wci-* attributes — roles, descriptions, state snapshots, and guards. No framework lock-in.
  - icon: ⚗️
    title: Distiller
    details: Compress annotated DOM into token-efficient JSON or Markdown views scoped to landmarks and priority-ranked nodes.
  - icon: ⚡
    title: Bridge
    details: Dispatch typed actions (fill, click, select…) and receive structured ActionResult payloads with side-effect detection.
  - icon: 🌐
    title: Site context
    details: Root-level wci.txt, wci.json, and wci.md files define policy, manifests, and LLM system-prompt narrative — like robots.txt for agents.
---

## How it works

![WCI architecture: data-wci-* markup, distiller, LLM context, WciBridge actions, and site context files](/architecture.png)

## Install

```bash
npm install @webcontextinterface/core
```

Or use individual packages: `@webcontextinterface/spec`, `@webcontextinterface/distiller`, `@webcontextinterface/bridge`, `@webcontextinterface/context`.

## Site root files

| File | Purpose |
|------|---------|
| `/wci.txt` | Allow/deny scopes, rate limits, authentication |
| `/wci.json` | Structured manifest and task flows |
| `/wci.md` | Narrative context for the LLM system prompt |

## Evaluation dataset

The official **50-scenario** grounding benchmark is published on Zenodo (CC BY 4.0):

- **Record:** [Evaluation Dataset for WCI](https://zenodo.org/records/20434088)
- **DOI:** [10.5281/zenodo.20434088](https://doi.org/10.5281/zenodo.20434088)
- **Download:** [`scenarios.zip`](https://zenodo.org/records/20434088/files/scenarios.zip?download=1)

Each scenario includes raw HTML, DOM outline, interactive candidates, WCI full, and WCI grounding representations. The in-repo copy lives under [`demo/scenarios/`](https://github.com/amirrezaalasti/webcontextinterface/tree/main/demo/scenarios); methodology and commands are in [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md).

## NotebookLM

A [shared NotebookLM notebook](https://notebooklm.google.com/notebook/aa9fa965-4a1b-400d-a605-37f0632c2738) is a good way to introduce WCI — audio overviews, briefings, and Q&A grounded in the paper, specification, and benchmark materials. Viewers need a Google account to open the notebook.

::: tip Local development
Run `npm run demo` for the demo on port 5173, or `npm run website:build` then `npm run website:preview` for the combined static site (docs + demo at `/demo/`).
:::
