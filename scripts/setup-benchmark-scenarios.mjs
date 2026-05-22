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
import { buildGeneratedLayout } from './lib/scenario-layouts.mjs';

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

  const primarySel = rawSelectors[0]?.replace(/^#/, '') ?? `${id}-primary-action`;

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

const GENERATED_SPECS = [
  { id: 'job-board', title: 'HireFlow Jobs', icon: '💼', goal: 'Apply to the Senior Engineer role at Acme Corp', wciId: 'apply-senior-engineer', decoys: ['decoy-promo', 'decoy-nav'] },
  { id: 'healthcare-portal', title: 'MediGate Portal', icon: '🏥', goal: 'Schedule a video visit for next Tuesday', wciId: 'schedule-video-visit', decoys: ['decoy-nav'] },
  { id: 'email-client', title: 'InboxPro Mail', icon: '📧', goal: 'Archive the email thread from billing@acme.com', wciId: 'archive-billing-thread', decoys: ['decoy-promo'] },
  { id: 'calendar-app', title: 'CalSync', icon: '📅', goal: 'Create a team standup event every weekday at 9am', wciId: 'create-standup-series', decoys: [] },
  { id: 'food-delivery', title: 'QuickBite', icon: '🍔', goal: 'Add Chicken Teriyaki Bowl to cart and checkout', wciId: 'add-teriyaki-checkout', decoys: ['decoy-promo'] },
  { id: 'insurance-quote', title: 'ShieldSure', icon: '🛡️', goal: 'Get auto insurance quote for ZIP 94105', wciId: 'get-auto-quote', decoys: ['decoy-nav'] },
  { id: 'real-estate', title: 'HomeNest Listings', icon: '🏠', goal: 'Save the 3BR listing at 742 Evergreen Terrace', wciId: 'save-listing-742', decoys: ['decoy-promo'] },
  { id: 'lms-course', title: 'LearnPath LMS', icon: '🎓', goal: 'Mark Module 4 lesson as complete', wciId: 'complete-module-4', decoys: [] },
  { id: 'support-ticket', title: 'HelpDesk One', icon: '🎫', goal: 'Submit priority ticket for login outage', wciId: 'submit-priority-ticket', decoys: ['decoy-nav'] },
  { id: 'ecommerce-search', title: 'ShopGrid', icon: '🛍️', goal: 'Filter results to 4-star and above under $50', wciId: 'apply-rating-price-filter', decoys: ['decoy-promo'] },
  { id: 'streaming-service', title: 'StreamVault', icon: '🎬', goal: 'Add documentary "Ocean Deep" to watchlist', wciId: 'add-ocean-deep-watchlist', decoys: [] },
  { id: 'hotel-booking', title: 'StayFinder', icon: '🏨', goal: 'Book the downtown Marriott for 2 nights', wciId: 'book-marriott-downtown', decoys: ['decoy-promo'] },
  { id: 'tax-filing', title: 'TaxEase', icon: '📑', goal: 'Import W-2 from employer ADP', wciId: 'import-w2-adp', decoys: ['decoy-nav'] },
  { id: 'weather-app', title: 'SkyCast', icon: '⛅', goal: 'Enable rain alerts for San Francisco', wciId: 'enable-sf-rain-alerts', decoys: [] },
  { id: 'parking-reservation', title: 'ParkSpot', icon: '🅿️', goal: 'Reserve garage spot B12 for Saturday 2pm', wciId: 'reserve-spot-b12', decoys: ['decoy-promo'] },
  { id: 'gym-membership', title: 'FitClub', icon: '💪', goal: 'Upgrade membership to annual plan', wciId: 'upgrade-annual-plan', decoys: [] },
  { id: 'pharmacy-order', title: 'RxDirect', icon: '💊', goal: 'Refill prescription for Lisinopril 10mg', wciId: 'refill-lisinopril', decoys: ['decoy-nav'] },
  { id: 'ride-share', title: 'GoRide', icon: '🚗', goal: 'Request ride to SFO Terminal 2', wciId: 'request-sfo-ride', decoys: ['decoy-promo'] },
  { id: 'voting-poll', title: 'VoteHub', icon: '🗳️', goal: 'Cast vote for Proposition 12', wciId: 'vote-prop-12', decoys: [] },
  { id: 'wiki-edit', title: 'OpenWiki', icon: '📖', goal: 'Publish edit to Web Context Interface article', wciId: 'publish-wci-edit', decoys: ['decoy-nav'] },
  { id: 'code-review', title: 'MergeLab', icon: '🔀', goal: 'Approve pull request #4182', wciId: 'approve-pr-4182', decoys: ['decoy-promo'] },
  { id: 'inventory-mgmt', title: 'StockPilot', icon: '📦', goal: 'Reorder SKU WH-9921 quantity 500', wciId: 'reorder-sku-wh9921', decoys: [] },
  { id: 'subscription-cancel', title: 'SubStack Billing', icon: '🔔', goal: 'Cancel Premium subscription effective next cycle', wciId: 'cancel-premium-sub', decoys: ['decoy-promo'] },
  { id: 'password-reset', title: 'AuthGate', icon: '🔐', goal: 'Send password reset link to user@corp.com', wciId: 'send-reset-link', decoys: ['decoy-nav'] },
  { id: 'document-sign', title: 'SignNow', icon: '✍️', goal: 'Sign employment agreement page 12', wciId: 'sign-agreement-p12', decoys: [] },
  { id: 'survey-form', title: 'FeedbackLoop', icon: '📋', goal: 'Submit NPS score 9 with comment', wciId: 'submit-nps-9', decoys: ['decoy-promo'] },
  { id: 'charity-donate', title: 'GiveHope', icon: '❤️', goal: 'Donate $25 monthly to clean water fund', wciId: 'donate-water-fund', decoys: [] },
  { id: 'flight-checkin', title: 'AirCheck', icon: '🛫', goal: 'Select window seat 14A for flight AA882', wciId: 'select-seat-14a', decoys: ['decoy-nav'] },
  { id: 'visa-application', title: 'VisaPath', icon: '🛂', goal: 'Upload passport scan for B-1 application', wciId: 'upload-passport-scan', decoys: ['decoy-promo'] },
  { id: 'stock-trade', title: 'TradePulse', icon: '📈', goal: 'Buy 10 shares of AAPL at market', wciId: 'buy-aapl-market', decoys: [] },
  { id: 'podcast-subscribe', title: 'PodWave', icon: '🎙️', goal: 'Subscribe to show "AI Daily"', wciId: 'subscribe-ai-daily', decoys: ['decoy-promo'] },
  { id: 'photo-upload', title: 'CloudAlbum', icon: '📷', goal: 'Upload vacation album "Iceland 2026"', wciId: 'upload-iceland-album', decoys: [] },
  { id: 'forum-post', title: 'DevForum', icon: '💬', goal: 'Pin the thread "WCI specification feedback"', wciId: 'pin-wci-thread', decoys: ['decoy-nav'] },
  { id: 'dating-profile', title: 'MatchMingle', icon: '💕', goal: 'Send intro message to profile @river_kayak', wciId: 'message-river-kayak', decoys: ['decoy-promo'] },
  { id: 'rental-car', title: 'DriveAway', icon: '🚙', goal: 'Reserve compact car pickup LAX Friday', wciId: 'reserve-lax-compact', decoys: [] },
  { id: 'concert-tickets', title: 'TicketRush', icon: '🎵', goal: 'Buy 2 GA tickets for Neon Pulse tour', wciId: 'buy-neon-pulse-ga', decoys: ['decoy-promo'] },
  { id: 'grocery-list', title: 'FreshCart', icon: '🥬', goal: 'Add organic avocados to shared family list', wciId: 'add-avocados-list', decoys: ['decoy-nav'] },
  { id: 'pet-adoption', title: 'PawMatch', icon: '🐾', goal: 'Submit adoption application for dog Max', wciId: 'apply-adopt-max', decoys: [] },
  { id: 'scholarship-apply', title: 'EduGrant', icon: '🎓', goal: 'Submit STEM scholarship application', wciId: 'submit-stem-scholarship', decoys: ['decoy-promo'] },
  { id: 'wifi-setup', title: 'NetConfig', icon: '📶', goal: 'Connect device to guest network Guest_5G', wciId: 'connect-guest-5g', decoys: [] },
  { id: 'invoice-pay', title: 'BillFlow', icon: '🧾', goal: 'Pay invoice INV-2026-044 due today', wciId: 'pay-inv-2026-044', decoys: ['decoy-nav'] },
  { id: 'newsletter-sub', title: 'PostBrief', icon: '📰', goal: 'Subscribe to weekly AI digest', wciId: 'subscribe-ai-digest', decoys: ['decoy-promo'] },
  { id: 'api-keys', title: 'DevConsole', icon: '🔑', goal: 'Rotate production API key', wciId: 'rotate-prod-api-key', decoys: [] },
  { id: 'privacy-settings', title: 'PrivacyDesk', icon: '🔒', goal: 'Disable third-party data sharing', wciId: 'disable-third-party-share', decoys: ['decoy-nav'] },
  { id: 'bug-report', title: 'IssueTrack', icon: '🐛', goal: 'File bug reproducing checkout timeout', wciId: 'file-checkout-timeout-bug', decoys: ['decoy-promo'] },
];

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
    description: 'CRM dashboard with KPI cards, sortable data tables, bulk actions, multi-level sidebar navigation, keyboard shortcut overlays, and deeply nested SVG icons.',
    challenges: ['Hidden keyboard shortcuts overlay in DOM', 'Multi-level sidebar navigation with submenus', 'Data table with checkboxes, inline actions, and hidden bulk action bar', 'Pagination with ellipsis buttons', 'KPI cards with SVG trend icons — decorative but parsed as interactive', 'Deeply nested SVG paths produce enormous DOM output'],
    task: { goal: 'Find the deal with the highest probability and export the dashboard', standardSteps: [{ action: 'scan', target: 'full DOM', outcome: 'confused', note: 'Agent finds 180+ elements including hidden shortcuts overlay, SVG paths' }, { action: 'scan', target: 'table', outcome: 'confused', note: 'Table has checkboxes, action buttons, stage badges — hard to extract data' }, { action: 'click', target: 'deal row checkbox', outcome: 'fail', note: 'Accidentally selects deal checkbox instead of reading data' }, { action: 'scan', target: 'probability column', outcome: 'confused', note: 'Tries to parse table cells — no clear structure for probability values' }, { action: 'identify', target: 'SaaS Migration 80%', outcome: 'success', note: 'Eventually finds highest probability deal' }, { action: 'click', target: 'Export button', outcome: 'confused', note: 'Multiple buttons with similar text — sidebar has pipeline export too' }, { action: 'click', target: 'correct Export button', outcome: 'success', note: 'Finds the dashboard export button' }], agentdomSteps: [{ action: 'read', target: 'deals-table display node', outcome: 'success', note: 'Gets structured deal data with probability field' }, { action: 'compare', target: 'probability values in state', outcome: 'success', note: 'SaaS Migration — Delta LLC has 80% probability' }, { action: 'click', target: 'export-btn', outcome: 'success', note: 'Clicks typed export button — gets ActionResult' }] },
    groundTruth: { wciNodeId: 'export-btn', acceptableNodeIds: [], decoyNodeIds: ['export-csv-btn'], rawSelectors: ['.qc-topbar__right button:has-text("Export")', '.qc-topbar button.qc-btn--ghost:has-text("Export")'] },
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
    writeScenario(id, fs.readFileSync(rawPath, 'utf8'), fs.readFileSync(annPath, 'utf8'), meta);
    manifestEntries.push({ id, legacy: true });
    console.log(`Preserved legacy: ${id}`);
  }

  for (const spec of GENERATED_SPECS) {
    const difficulty = spec.id.length % 3 === 0 ? 'Extreme' : spec.id.length % 2 === 0 ? 'Very Hard' : 'Hard';
    const full = { ...spec, difficulty };
    const { rawHtml, annotatedHtml, meta } = buildGeneratedScenario(full);
    writeScenario(spec.id, rawHtml, annotatedHtml, meta);
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

  console.log(`\nDone: ${manifest.count} scenarios in ${SCENARIOS_DIR}`);
}

main();
