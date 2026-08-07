// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — the real Node.js environment behind CommandContext
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import type { CommandContext } from './commands';

export function createNodeContext(cwd: string = process.cwd()): CommandContext {
  const at = (path: string): string => resolve(cwd, path);

  return {
    cwd,

    readFile: (path) => readFile(at(path), 'utf8'),

    writeFile: async (path, content) => {
      const full = at(path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
    },

    fileExists: async (path) => existsSync(at(path)),

    parseHtml: (html) => {
      // `runScripts` is left at its default (off) so validating a downloaded
      // page cannot execute that page's JavaScript on the developer's machine.
      const dom = new JSDOM(html);
      return {
        document: dom.window.document,
        close: () => dom.window.close(),
      };
    },

    fetchText: async (url) => {
      const res = await fetch(url, { headers: { 'User-Agent': 'wci-cli' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.text();
    },

    log: (line) => process.stdout.write(`${line}\n`),
    error: (line) => process.stderr.write(`${line}\n`),
  };
}
