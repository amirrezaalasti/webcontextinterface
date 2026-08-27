/** Canonical site URL for SEO (sitemap, Open Graph, JSON-LD). Override with SITE_URL at build time. */
export const SITE_URL = (
  process.env.SITE_URL ?? 'https://webcontextinterface.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Web Context Interface';
export const SITE_SHORT_NAME = 'WCI';

export const SITE_DESCRIPTION =
  'Web Context Interface (WCI) is an open standard and TypeScript SDK for LLM-native web pages — data-wci-* markup, distillation, typed actions, and site context files.';

export const SITE_OG_DESCRIPTION =
  'Open standard and TypeScript SDK for LLM-readable web pages: data-wci-* markup, distillation, and typed actions.';

export const SITE_OG_IMAGE = `${SITE_URL}/logo-with-title.png`;

/** Build a canonical URL for a VitePress page (cleanUrls). */
export function vitePressCanonicalPath(relativePath: string, base = '/'): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  let path = relativePath.replace(/\.md$/i, '');
  if (path === 'index' || path.endsWith('/index')) {
    path = path.replace(/\/?index$/, '') || '';
  }
  const suffix = path ? `/${path}` : '';
  return `${SITE_URL}${normalizedBase}${suffix}`.replace(/([^:]\/)\/+/g, '$1').replace(/\/$/, '') || SITE_URL;
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: [SITE_SHORT_NAME, 'Web Context Interface (WCI)'],
        description: SITE_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: SITE_SHORT_NAME,
        url: `${SITE_URL}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
        },
        sameAs: ['https://github.com/amirrezaalasti/webcontextinterface'],
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        alternateName: SITE_SHORT_NAME,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: SITE_DESCRIPTION,
        url: `${SITE_URL}/`,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };
}
