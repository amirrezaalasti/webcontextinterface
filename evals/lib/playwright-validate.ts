import { chromium, type Browser, type Page } from 'playwright';
import type { ScenarioGroundTruth } from './ground-truth';
import { extractCssSelector, parseCandidateIndex } from './scorers';
import { buildInteractiveCandidates } from './contexts';

let sharedBrowser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

async function loadPage(html: string): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  return page;
}

/** Resolve ground-truth element in raw HTML using verified selectors */
export async function resolveGroundTruthLocator(
  rawHtml: string,
  gt: ScenarioGroundTruth
): Promise<{ selector: string; count: number } | null> {
  const page = await loadPage(rawHtml);
  try {
    for (const sel of gt.rawSelectors) {
      const loc = page.locator(sel);
      const count = await loc.count();
      if (count >= 1) {
        await page.close();
        return { selector: sel, count };
      }
    }
    await page.close();
    return null;
  } catch {
    await page.close();
    return null;
  }
}

export async function validateCssSelector(
  rawHtml: string,
  predictedSelector: string,
  gt: ScenarioGroundTruth
): Promise<{ valid: boolean; matchesGroundTruth: boolean; matchesCount: number; error?: string }> {
  const page = await loadPage(rawHtml);
  try {
    const pred = page.locator(predictedSelector);
    const count = await pred.count();
    if (count === 0) {
      return { valid: false, matchesGroundTruth: false, matchesCount: 0, error: 'Selector matched 0 elements' };
    }

    let matchesGroundTruth = false;
    for (const sel of gt.rawSelectors) {
      const gtLoc = page.locator(sel);
      const gtCount = await gtLoc.count();
      if (gtCount === 0) continue;

      // Match if predicted element is any ground-truth node for this selector
      const same = await pred.first().evaluate(
        (predEl, gtSelector) => {
          const nodes = document.querySelectorAll(gtSelector);
          for (let i = 0; i < nodes.length; i++) {
            if (predEl === nodes[i]) return true;
          }
          return false;
        },
        sel
      );
      if (same) {
        matchesGroundTruth = true;
        break;
      }
    }

    return { valid: true, matchesGroundTruth, matchesCount: count };
  } catch (e) {
    return {
      valid: false,
      matchesGroundTruth: false,
      matchesCount: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    await page.close();
  }
}

/** Map candidate index to element and compare to ground truth selector */
export async function validateCandidateIndex(
  rawHtml: string,
  index: number,
  gt: ScenarioGroundTruth
): Promise<{ valid: boolean; matchesGroundTruth: boolean }> {
  const page = await loadPage(rawHtml);
  try {
    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [onclick]';
    const loc = page.locator(selector);
    const count = await loc.count();
    if (index < 0 || index >= count) {
      return { valid: false, matchesGroundTruth: false };
    }

    const candidate = loc.nth(index);
    for (const sel of gt.rawSelectors) {
      const gtLoc = page.locator(sel);
      if ((await gtLoc.count()) === 0) continue;
      const same = await candidate.evaluate(
        (el, gtSelector) => {
          const gtEl = document.querySelector(gtSelector);
          return gtEl !== null && el === gtEl;
        },
        sel
      );
      if (same) return { valid: true, matchesGroundTruth: true };
    }
    return { valid: true, matchesGroundTruth: false };
  } catch {
    return { valid: false, matchesGroundTruth: false };
  } finally {
    await page.close();
  }
}

export async function scoreRawPrediction(
  rawHtml: string,
  predicted: string,
  gt: ScenarioGroundTruth
): Promise<{
  correct: boolean;
  validSelector: boolean;
  parsed: string | null;
  validationError?: string;
}> {
  const idx = parseCandidateIndex(predicted);
  if (idx !== null) {
    const v = await validateCandidateIndex(rawHtml, idx, gt);
    return {
      correct: v.matchesGroundTruth,
      validSelector: v.valid,
      parsed: `[${idx}]`,
      validationError: v.valid ? undefined : 'Invalid candidate index',
    };
  }

  const selector = extractCssSelector(predicted) ?? (predicted.includes('<') ? null : predicted.trim());
  if (!selector) {
    return { correct: false, validSelector: false, parsed: null, validationError: 'No selector parsed' };
  }

  const v = await validateCssSelector(rawHtml, selector, gt);
  return {
    correct: v.matchesGroundTruth,
    validSelector: v.valid,
    parsed: selector,
    validationError: v.error,
  };
}
