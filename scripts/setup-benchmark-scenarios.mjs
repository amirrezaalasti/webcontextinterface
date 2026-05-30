#!/usr/bin/env node
/**
 * Idempotent setup: preserve 5 legacy scenarios, regenerate 45 domain-specific
 * layouts with annotation overlay, manifest.json, and ground-truth stubs.
 *
 * Regenerate: node scripts/setup-benchmark-scenarios.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildAnnotatedFromRaw } from './lib/annotate-html.mjs';
import { HARD_GOALS } from './lib/scenario-goals.mjs';
import { buildGeneratedLayout } from './lib/scenario-layouts.mjs';
import { injectLegacyStyles, LEGACY_STYLE_IDS } from './lib/legacy-scenario-styles.mjs';
import { addMultiStepTasks } from './lib/scenario-multistep.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(ROOT, 'demo/scenarios');

/** Hand-authored scenarios — preserve raw.html / annotated.html on disk */
const LEGACY_IDS = [
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeScenario(id, rawHtml, annotatedHtml, meta) {
  const dir = path.join(SCENARIOS_DIR, id);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'raw.html'), rawHtml, 'utf8');
  fs.writeFileSync(path.join(dir, 'annotated.html'), annotatedHtml, 'utf8');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

function slug(id) {
  return id.replace(/-/g, '_');
}

/** Domain-specific layout + annotation overlay on same raw DOM */
function buildGeneratedScenario(spec) {
  const { id, title, icon, difficulty, goal, wciId, decoys } = spec;
  const { rawHtml, plan, rawSelectors, description, challenges } = buildGeneratedLayout(spec);
  const annotatedHtml = buildAnnotatedFromRaw(rawHtml, plan);

  const primarySel = rawSelectors[0] ?? `${id}-primary-action`;

  const meta = {
    id,
    title,
    icon,
    difficulty,
    description,
    challenges,
    task: {
      goal,
      standardSteps: [
        { action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Many decoy buttons, ads, and domain-specific layout noise' },
        { action: 'click', target: 'decoy element', outcome: 'fail', note: 'Clicks promotional or nav decoy' },
        { action: 'click', target: primarySel, outcome: 'success', note: 'Finds correct primary CTA in page-specific structure' },
      ],
      agentdomSteps: [
        { action: 'read', target: `${slug(id)}-page`, outcome: 'success', note: 'Structured page landmark with typed actions' },
        { action: 'click', target: wciId, outcome: 'success', note: 'Direct WCI node click on annotated overlay' },
      ],
    },
    groundTruth: {
      wciNodeId: wciId,
      acceptableNodeIds: [],
      decoyNodeIds: decoys ?? [],
      rawSelectors,
    },
  };

  return { rawHtml, annotatedHtml, meta };
}

/** Generated scenario specs — goals from HARD_GOALS (constraint-based, no button-label quotes). */
const GENERATED_SPECS = [
  { id: 'job-board', title: 'HireFlow Jobs', icon: '💼', wciId: 'apply-senior-engineer', decoys: ['decoy-promo', 'decoy-nav', 'decoy-extra'] },
  { id: 'healthcare-portal', title: 'MediGate Portal', icon: '🏥', wciId: 'schedule-video-visit', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'email-client', title: 'InboxPro Mail', icon: '📧', wciId: 'archive-billing-thread', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'calendar-app', title: 'CalSync', icon: '📅', wciId: 'create-standup-series', decoys: ['decoy-extra'] },
  { id: 'food-delivery', title: 'QuickBite', icon: '🍔', wciId: 'add-teriyaki-checkout', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'insurance-quote', title: 'ShieldSure', icon: '🛡️', wciId: 'get-auto-quote', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'real-estate', title: 'HomeNest Listings', icon: '🏠', wciId: 'save-listing-742', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'lms-course', title: 'LearnPath LMS', icon: '🎓', wciId: 'complete-module-4', decoys: ['decoy-extra'] },
  { id: 'support-ticket', title: 'HelpDesk One', icon: '🎫', wciId: 'submit-priority-ticket', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'ecommerce-search', title: 'ShopGrid', icon: '🛍️', wciId: 'apply-rating-price-filter', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'streaming-service', title: 'StreamVault', icon: '🎬', wciId: 'add-ocean-deep-watchlist', decoys: ['decoy-extra'] },
  { id: 'hotel-booking', title: 'StayFinder', icon: '🏨', wciId: 'book-marriott-downtown', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'tax-filing', title: 'TaxEase', icon: '📑', wciId: 'import-w2-adp', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'weather-app', title: 'SkyCast', icon: '⛅', wciId: 'enable-sf-rain-alerts', decoys: ['decoy-extra'] },
  { id: 'parking-reservation', title: 'ParkSpot', icon: '🅿️', wciId: 'reserve-spot-b12', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'gym-membership', title: 'FitClub', icon: '💪', wciId: 'upgrade-annual-plan', decoys: ['decoy-extra'] },
  { id: 'pharmacy-order', title: 'RxDirect', icon: '💊', wciId: 'refill-lisinopril', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'ride-share', title: 'GoRide', icon: '🚗', wciId: 'request-sfo-ride', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'voting-poll', title: 'VoteHub', icon: '🗳️', wciId: 'vote-prop-12', decoys: ['decoy-extra'] },
  { id: 'wiki-edit', title: 'OpenWiki', icon: '📖', wciId: 'publish-wci-edit', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'code-review', title: 'MergeLab', icon: '🔀', wciId: 'approve-pr-4182', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'inventory-mgmt', title: 'StockPilot', icon: '📦', wciId: 'reorder-sku-wh9921', decoys: ['decoy-extra'] },
  { id: 'subscription-cancel', title: 'SubStack Billing', icon: '🔔', wciId: 'cancel-premium-sub', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'password-reset', title: 'AuthGate', icon: '🔐', wciId: 'send-reset-link', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'document-sign', title: 'SignNow', icon: '✍️', wciId: 'sign-agreement-p12', decoys: ['decoy-extra'] },
  { id: 'survey-form', title: 'FeedbackLoop', icon: '📋', wciId: 'submit-nps-9', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'charity-donate', title: 'GiveHope', icon: '❤️', wciId: 'donate-water-fund', decoys: ['decoy-extra'] },
  { id: 'flight-checkin', title: 'AirCheck', icon: '🛫', wciId: 'select-seat-14a', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'visa-application', title: 'VisaPath', icon: '🛂', wciId: 'upload-passport-scan', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'stock-trade', title: 'TradePulse', icon: '📈', wciId: 'buy-aapl-market', decoys: ['decoy-extra'] },
  { id: 'podcast-subscribe', title: 'PodWave', icon: '🎙️', wciId: 'subscribe-ai-daily', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'photo-upload', title: 'CloudAlbum', icon: '📷', wciId: 'upload-iceland-album', decoys: ['decoy-extra'] },
  { id: 'forum-post', title: 'DevForum', icon: '💬', wciId: 'pin-wci-thread', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'dating-profile', title: 'MatchMingle', icon: '💕', wciId: 'message-river-kayak', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'rental-car', title: 'DriveAway', icon: '🚙', wciId: 'reserve-lax-compact', decoys: ['decoy-extra'] },
  { id: 'concert-tickets', title: 'TicketRush', icon: '🎵', wciId: 'buy-neon-pulse-ga', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'grocery-list', title: 'FreshCart', icon: '🥬', wciId: 'add-avocados-list', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'pet-adoption', title: 'PawMatch', icon: '🐾', wciId: 'apply-adopt-max', decoys: ['decoy-extra'] },
  { id: 'scholarship-apply', title: 'EduGrant', icon: '🎓', wciId: 'submit-stem-scholarship', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'wifi-setup', title: 'NetConfig', icon: '📶', wciId: 'connect-guest-5g', decoys: ['decoy-extra'] },
  { id: 'invoice-pay', title: 'BillFlow', icon: '🧾', wciId: 'pay-inv-2026-044', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'newsletter-sub', title: 'PostBrief', icon: '📰', wciId: 'subscribe-ai-digest', decoys: ['decoy-promo', 'decoy-extra'] },
  { id: 'api-keys', title: 'DevConsole', icon: '🔑', wciId: 'rotate-prod-api-key', decoys: ['decoy-extra', 'decoy-emergency-rotate', 'decoy-rotate-all-prod', 'decoy-rotate-selected', 'staging-reveal-btn'] },
  { id: 'privacy-settings', title: 'PrivacyDesk', icon: '🔒', wciId: 'disable-third-party-share', decoys: ['decoy-nav', 'decoy-extra'] },
  { id: 'bug-report', title: 'IssueTrack', icon: '🐛', wciId: 'file-checkout-timeout-bug', decoys: ['decoy-promo', 'decoy-extra'] },
].map((s) => ({ ...s, goal: HARD_GOALS[s.id] }));

const LEGACY_META = {
  'flight-booking': {
    id: 'flight-booking', title: 'SkyWing Airlines', icon: '✈️', difficulty: 'Extreme',
    description: 'Flight search results with nested fare cards, filter sidebar with decoy ads, promotional banners disguised as results, mega-menu navigation, cookie consent overlays.',
    challenges: ['Sponsored results disguised as real flight cards', 'Mega-menu with dozens of nested navigation links', 'Filter sidebar with range sliders and hidden sections', 'Tracking pixels and analytics scripts in DOM', 'Cookie consent overlay blocking interactions', 'Fare comparison tables hidden behind toggle buttons'],
    task: { goal: 'Select the cheapest nonstop Economy flight from JFK to LAX', standardSteps: [{ action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Agent parses 200+ elements, finds 40+ clickable targets' }, { action: 'click', target: 'Spring Sale promo link', outcome: 'fail', note: 'Mistakenly clicks promotional ad link in mega-menu' }, { action: 'backtrack', target: 'results page', outcome: 'backtrack', note: 'Returns to search results, re-parses DOM' }, { action: 'click', target: 'SkyMiles promo card', outcome: 'fail', note: 'Clicks inline promotional banner thinking it\'s a flight' }, { action: 'backtrack', target: 'results page', outcome: 'backtrack', note: 'Confused by promotional content mixed with results' }, { action: 'scan', target: 'sort options', outcome: 'confused', note: 'Tries to sort by price but unsure which select element' }, { action: 'click', target: 'SW1042 economy fare button', outcome: 'success', note: 'Finally identifies correct button after multiple attempts' }, { action: 'verify', target: 'unknown', outcome: 'confused', note: 'No confirmation — must re-parse DOM to verify selection' }], agentdomSteps: [{ action: 'read', target: 'flight-search-results scope', outcome: 'success', note: 'Gets 3 flight results with prices in structured JSON' }, { action: 'compare', target: 'fare data in state', outcome: 'success', note: 'Identifies SW1042 Economy $329 as cheapest nonstop' }, { action: 'click', target: 'select-SW1042-economy', outcome: 'success', note: 'Direct action on typed node with ActionResult confirmation' }] },
    groundTruth: { wciNodeId: 'select-SW1042-economy', acceptableNodeIds: [], decoyNodeIds: ['select-UA447-economy', 'select-DL892-economy', 'modify-search-btn', 'reset-filters-btn'], rawSelectors: ['[data-flight-id="SW1042"] button.sw-fare-btn--economy[data-price="329"]', '[data-flight-id="SW1042"] .sw-fare-btn--economy'] },
  },
  banking: {
    id: 'banking', title: 'NovaPay Banking', icon: '🏦', difficulty: 'Extreme',
    description: 'Banking dashboard with multi-account summaries, transfer form with validation, transaction tables, session warnings, chat widgets, and promotional banners.',
    challenges: ['Session timeout overlay hidden in DOM', 'Transfer form with dynamic validation and disabled submit', 'Multiple similar "Transfer" buttons across different accounts', 'Transaction table with nested icon/description elements', 'Chat widget and notification toasts as interactive distractions', 'Promotional credit card ad disguised as dashboard content'],
    task: { goal: 'Transfer $500 from Checking to Savings account', standardSteps: [{ action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Agent finds 150+ elements including hidden session dialog and chat widget' }, { action: 'click', target: 'Transfer button on checking card', outcome: 'confused', note: 'Multiple "Transfer" buttons — unclear which one to use' }, { action: 'click', target: 'sidebar Transfer nav link', outcome: 'fail', note: 'Navigates to separate transfer page instead of quick transfer' }, { action: 'backtrack', target: 'dashboard', outcome: 'backtrack', note: 'Returns to dashboard' }, { action: 'fill', target: 'xfer-from select', outcome: 'confused', note: 'Locates form but unsure which select is source vs destination' }, { action: 'fill', target: 'xfer-amount input', outcome: 'success', note: 'Enters amount' }, { action: 'click', target: 'Review Transfer button', outcome: 'fail', note: 'Button is disabled — agent doesn\'t know why' }, { action: 'fill', target: 'correct fields', outcome: 'success', note: 'Eventually fills all fields correctly' }, { action: 'click', target: 'Review Transfer button', outcome: 'success', note: 'Button now enabled, clicks it' }, { action: 'verify', target: 'unknown', outcome: 'confused', note: 'Re-parses full DOM to check if transfer initiated' }], agentdomSteps: [{ action: 'read', target: 'quick-transfer scope', outcome: 'success', note: 'Sees transfer form with typed fields and preconditions' }, { action: 'select', target: 'transfer-from', outcome: 'success', note: 'Selects "Checking" — knows balance from state' }, { action: 'select', target: 'transfer-to', outcome: 'success', note: 'Selects "Savings"' }, { action: 'fill', target: 'transfer-amount', outcome: 'success', note: 'Enters $500 — precondition tells it max is $12,847.63' }, { action: 'click', target: 'review-transfer-btn', outcome: 'success', note: 'Clicks review — gets ActionResult with state change' }] },
    groundTruth: { wciNodeId: 'review-transfer-btn', acceptableNodeIds: [], decoyNodeIds: ['export-csv-btn', 'pay-credit-bill-btn'], rawSelectors: ['.np-quick-transfer button.np-btn--primary', '.np-quick-transfer__form button.np-btn--primary', 'button:has-text("Review Transfer")'] },
  },
  checkout: {
    id: 'checkout', title: 'VelvetCart Checkout', icon: '🛒', difficulty: 'Very Hard',
    description: 'Multi-step checkout with hidden A/B test variants, address books, shipping options, promo codes, gift wrapping, upsell widgets, and trust badges.',
    challenges: ['Hidden A/B test variant button with alternate checkout flow', 'Address book with saved addresses vs new address form', 'Multi-step progress indicator (Step 2 of 4)', 'Promo code section hidden behind toggle', 'Upsell widget looks like part of checkout', 'Trust badges and decorative SVGs add noise'],
    task: { goal: 'Complete shipping step with Express shipping and continue to payment', standardSteps: [{ action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Finds hidden A/B test button, upsell add buttons, multiple forms' }, { action: 'click', target: 'A/B test alternate checkout button', outcome: 'fail', note: 'Clicks hidden variant button — unexpected behavior' }, { action: 'backtrack', target: 'checkout page', outcome: 'backtrack', note: 'Recovers from A/B test variant' }, { action: 'scan', target: 'shipping section', outcome: 'confused', note: 'Finds new address form (hidden) and saved address — unclear state' }, { action: 'click', target: 'express shipping radio', outcome: 'success', note: 'Selects express shipping' }, { action: 'click', target: 'upsell Add button', outcome: 'fail', note: 'Accidentally clicks upsell widget Add button' }, { action: 'backtrack', target: 'remove upsell item', outcome: 'backtrack', note: 'Must undo upsell addition' }, { action: 'click', target: 'Continue to Payment button', outcome: 'success', note: 'Finally clicks correct button' }, { action: 'verify', target: 'unknown', outcome: 'confused', note: 'Re-parses DOM to verify step change' }], agentdomSteps: [{ action: 'read', target: 'checkout-flow scope', outcome: 'success', note: 'Step 2/4, contact pre-filled, address selected, shipping options listed' }, { action: 'select', target: 'shipping-option', outcome: 'success', note: 'Selects "Express (2–3 days, $12.99)" from typed options' }, { action: 'click', target: 'continue-payment-btn', outcome: 'success', note: 'Preconditions met — gets ActionResult with step 3 transition' }] },
    groundTruth: { wciNodeId: 'continue-payment-btn', acceptableNodeIds: [], decoyNodeIds: [], rawSelectors: ['#continue-to-payment', 'button#continue-to-payment', 'button:has-text("Continue to Payment")'] },
  },
  'social-feed': {
    id: 'social-feed', title: 'ChatterBox Social', icon: '💬', difficulty: 'Hard',
    description: 'Social media feed with sponsored posts disguised as content, notification overlays, stories bar, nested comment threads, trending sidebar, and follow suggestions.',
    challenges: ['Notification permission overlay blocking the feed', 'Sponsored post identical in structure to real posts', 'Deeply nested reply threads with identical button patterns', 'Stories bar with numerous avatar buttons', 'Right sidebar with trending topics and follow buttons', 'Every post has 4–5 identical icon buttons (reply, repost, like, share, bookmark)'],
    task: { goal: 'Like the post by @alice_dev about AgentDOM', standardSteps: [{ action: 'dismiss', target: 'notification overlay', outcome: 'confused', note: 'Agent must first dismiss the notification prompt overlay' }, { action: 'click', target: 'Not Now button', outcome: 'success', note: 'Dismisses overlay' }, { action: 'scan', target: 'full feed', outcome: 'confused', note: 'Finds 30+ identical icon buttons, can\'t distinguish like from reply' }, { action: 'click', target: 'sponsored post like button', outcome: 'fail', note: 'Likes the sponsored TechGear post instead — same structure' }, { action: 'scan', target: 'posts', outcome: 'confused', note: 'Re-scans to find Alice\'s post among nested replies and sponsored content' }, { action: 'click', target: 'Alice reply-thread like', outcome: 'fail', note: 'Likes a reply in Alice\'s thread instead of the main post' }, { action: 'click', target: 'correct heart icon', outcome: 'success', note: 'Finally finds and clicks the right like button' }], agentdomSteps: [{ action: 'read', target: 'post-p_81924 scope', outcome: 'success', note: 'Finds post by @alice_dev with typed action buttons' }, { action: 'click', target: 'like-p_81924', outcome: 'success', note: 'Clicks typed like button — gets ActionResult with count 568' }] },
    groundTruth: { wciNodeId: 'like-p_81924', acceptableNodeIds: [], decoyNodeIds: ['like-p_81925'], rawSelectors: ['article[data-post-id="p_81924"] .cb-post__actions > button:nth-child(3)', 'article[data-post-id="p_81924"] .cb-post__actions button:nth-child(3)'] },
  },
  'admin-dashboard': {
    id: 'admin-dashboard', title: 'QuantumCRM Admin', icon: '📊', difficulty: 'Very Hard',
    description: 'Full-width CRM command center: six KPI cards, revenue chart and pipeline funnel, eight-row deals table with filters and bulk actions, activity sidebar, export modal, keyboard shortcuts, and a decoy pipeline CSV export.',
    challenges: ['Three-column layout with hidden right panel on smaller viewports', 'Multiple ghost buttons in top bar (notifications, refresh, export)', 'Decoy Export CSV under Pipeline submenu vs dashboard Export', 'Closed-won deals in table can mislead probability comparison', 'Stage and owner filters plus search narrow visible rows', 'Keyboard shortcuts overlay and export modal both block interaction', 'Bulk action bar appears only when rows are selected', 'Sortable column headers and six KPI cards with SVG icons'],
    task: { goal: 'Find the deal with the highest probability and export the dashboard', standardSteps: [{ action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Agent finds 180+ elements including hidden shortcuts overlay, SVG paths' }, { action: 'scan', target: 'table', outcome: 'confused', note: 'Table has checkboxes, action buttons, stage badges — hard to extract data' }, { action: 'click', target: 'deal row checkbox', outcome: 'fail', note: 'Accidentally selects deal checkbox instead of reading data' }, { action: 'scan', target: 'probability column', outcome: 'confused', note: 'Tries to parse table cells — no clear structure for probability values' }, { action: 'identify', target: 'SaaS Migration 80%', outcome: 'success', note: 'Eventually finds highest probability deal' }, { action: 'click', target: 'Export button', outcome: 'confused', note: 'Multiple buttons with similar text — sidebar has pipeline export too' }, { action: 'click', target: 'correct Export button', outcome: 'success', note: 'Finds the dashboard export button' }], agentdomSteps: [{ action: 'read', target: 'deals-table display node', outcome: 'success', note: 'Gets structured deal data with probability field' }, { action: 'compare', target: 'probability values in state', outcome: 'success', note: 'SaaS Migration — Delta LLC has 80% probability' }, { action: 'click', target: 'export-btn', outcome: 'success', note: 'Clicks typed export button — gets ActionResult' }] },
    groundTruth: { wciNodeId: 'export-btn', acceptableNodeIds: [], decoyNodeIds: ['export-csv-btn'], rawSelectors: ['#export-btn', '.qc-topbar__right button:has-text("Export")'] },
  },
};

function main() {
  ensureDir(SCENARIOS_DIR);

  const manifestEntries = [];

  for (const id of LEGACY_IDS) {
    const dir = path.join(SCENARIOS_DIR, id);
    const rawPath = path.join(dir, 'raw.html');
    const annPath = path.join(dir, 'annotated.html');
    if (!fs.existsSync(rawPath) || !fs.existsSync(annPath)) {
      throw new Error(`Missing legacy HTML for ${id} — add raw.html and annotated.html under demo/scenarios/${id}/`);
    }
    const meta = LEGACY_META[id];
    if (!meta) throw new Error(`Missing LEGACY_META for ${id}`);
    let rawHtml = fs.readFileSync(rawPath, 'utf8');
    let annotatedHtml = fs.readFileSync(annPath, 'utf8');
    if (LEGACY_STYLE_IDS.includes(id)) {
      rawHtml = injectLegacyStyles(rawHtml, id);
      annotatedHtml = injectLegacyStyles(annotatedHtml, id);
    }
    writeScenario(id, rawHtml, annotatedHtml, addMultiStepTasks(meta, { legacy: true }));
    manifestEntries.push({ id, legacy: true });
    console.log(`Preserved legacy: ${id}`);
  }

  for (const spec of GENERATED_SPECS) {
    const difficulty = spec.id.length % 3 === 0 ? 'Extreme' : spec.id.length % 2 === 0 ? 'Very Hard' : 'Hard';
    const full = { ...spec, difficulty };
    const { rawHtml, annotatedHtml, meta } = buildGeneratedScenario(full);
    writeScenario(spec.id, rawHtml, annotatedHtml, addMultiStepTasks(meta, { legacy: false }));
    manifestEntries.push({ id: spec.id, legacy: false });
    console.log(`Generated: ${spec.id}`);
  }

  const manifest = {
    version: 1,
    count: manifestEntries.length,
    scenarios: manifestEntries.map((e) => e.id),
  };
  fs.writeFileSync(path.join(SCENARIOS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const gt = {};
  for (const id of manifest.scenarios) {
    const meta = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, id, 'meta.json'), 'utf8'));
    if (meta.groundTruth) {
      gt[id] = { scenarioId: id, ...meta.groundTruth };
    }
  }
  fs.writeFileSync(
    path.join(SCENARIOS_DIR, 'ground-truth.generated.json'),
    JSON.stringify(gt, null, 2) + '\n',
    'utf8'
  );

  const multiStepCatalog = {};
  for (const id of manifest.scenarios) {
    const meta = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, id, 'meta.json'), 'utf8'));
    multiStepCatalog[id] = meta.tasks?.multiStep ?? [];
  }
  fs.writeFileSync(
    path.join(SCENARIOS_DIR, 'multi-step.generated.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: manifest.scenarios.length,
        scenarios: multiStepCatalog,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`\nDone: ${manifest.count} scenarios in ${SCENARIOS_DIR}`);
}

main();
