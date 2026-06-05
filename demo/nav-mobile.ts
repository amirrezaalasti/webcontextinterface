/** Toggle collapsible nav panels on small viewports (demo home + scenarios). */
export function initMobileNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const navId = toggle?.getAttribute('aria-controls') ?? 'site-nav';
  const nav = document.getElementById(navId);
  if (!toggle || !nav) return;

  const mq = window.matchMedia('(max-width: 960px)');

  const close = (): void => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('nav-open');
  };

  const open = (): void => {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('nav-open');
  };

  toggle.addEventListener('click', () => {
    if (nav.classList.contains('is-open')) close();
    else open();
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (mq.matches) close();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  mq.addEventListener('change', (e) => {
    if (!e.matches) close();
  });
}
