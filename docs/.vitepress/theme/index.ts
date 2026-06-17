import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { installVitePressStaticRouting } from '../../../shared/static-site-routing';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ router, siteData }) {
    installVitePressStaticRouting(router, siteData.value.base);
  },
} satisfies Theme;
