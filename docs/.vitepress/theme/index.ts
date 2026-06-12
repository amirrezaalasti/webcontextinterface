import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { isDemoAppPath, toDemoAppUrl } from '../../../shared/site-nav';
import './custom.css';

function navigateToDemoApp(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }
  if (!isDemoAppPath(url.pathname)) return false;
  window.location.assign(toDemoAppUrl(url.pathname, url.hash));
  return true;
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined') return;

    window.addEventListener(
      'click',
      (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const anchor = (event.target as Element | null)?.closest('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#')) return;

        if (navigateToDemoApp(href)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  },
} satisfies Theme;
