/**
 * Daniel Award — Cloudflare Worker
 *
 * Routes:
 *   GET  /               → Serves the registration page
 *   POST /api/payment    → Creates Stripe PaymentIntent
 *   POST /api/webhook    → Stripe webhook handler
 *
 * Environment variables (set via wrangler secret):
 *   STRIPE_SECRET_KEY
 *   STRIPE_PUBLISHABLE_KEY
 *   STRIPE_WEBHOOK_SECRET
 */

import { CONFIG } from './config.js';
import { CSS } from './styles.js';

// ═══════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(url.origin);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      // Page
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
        return servePage(env);
      }

      // Create PaymentIntent
      if (request.method === 'POST' && url.pathname === '/api/payment') {
        return createPayment(request, env, cors);
      }

      // Stripe Webhook
      if (request.method === 'POST' && url.pathname === '/api/webhook') {
        return handleWebhook(request, env);
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}


// ═══════════════════════════════════════════
// STRIPE: CREATE PAYMENT INTENT
// ═══════════════════════════════════════════

async function createPayment(request, env, cors) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Payment system not configured.' }, 500, cors);
  }

  const body = await request.json();
  const { amount, tier, firstName, lastName, email, phone, org, seats, guests } = body;

  if (!amount || amount < 1) return jsonResponse({ error: 'Invalid amount.' }, 400, cors);
  if (!email) return jsonResponse({ error: 'Email is required.' }, 400, cors);

  // Build Stripe form-encoded body
  const params = new URLSearchParams({
    'amount':                             String(amount * 100),
    'currency':                           'usd',
    'automatic_payment_methods[enabled]': 'true',
    'description':                        `Daniel Award — ${tier}`,
    'receipt_email':                       email,
    'metadata[event]':                    'Daniel Award',
    'metadata[tier]':                      tier || '',
    'metadata[seats]':                     String(seats || 0),
    'metadata[first_name]':                firstName || '',
    'metadata[last_name]':                 lastName || '',
    'metadata[email]':                     email,
    'metadata[phone]':                     phone || '',
    'metadata[org]':                        org || '',
    'metadata[guests]':                    (guests || '').substring(0, 500),
  });

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const intent = await res.json();

  if (intent.error) {
    return jsonResponse({ error: intent.error.message }, 400, cors);
  }

  return jsonResponse({
    clientSecret: intent.client_secret,
    intentId:     intent.id,
  }, 200, cors);
}


// ═══════════════════════════════════════════
// STRIPE: WEBHOOK
// ═══════════════════════════════════════════

async function handleWebhook(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 });
  }

  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  // Verify signature
  const isValid = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const m = intent.metadata || {};
    console.log(
      `[Daniel Award] Payment confirmed: ${intent.id} — ${m.first_name} ${m.last_name} (${m.email}) — $${(intent.amount / 100).toFixed(2)} — ${m.tier}`
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Verify Stripe webhook signature using Web Crypto API.
 * Stripe uses HMAC-SHA256 with a tolerance window.
 */
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    sigHeader.split(',').forEach(part => {
      const [k, v] = part.split('=');
      if (k === 't') parts.t = v;
      if (k === 'v1' && !parts.v1) parts.v1 = v;
    });

    if (!parts.t || !parts.v1) return false;

    // Check timestamp tolerance (5 minutes)
    const ts = parseInt(parts.t);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    // Compute expected signature
    const signedPayload = `${parts.t}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return expected === parts.v1;
  } catch {
    return false;
  }
}


// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return Number(n).toLocaleString('en-US');
}


// ═══════════════════════════════════════════
// SERVE PAGE
// ═══════════════════════════════════════════

function servePage(env) {
  const C = CONFIG;
  const h = C.hero;
  const hon = C.honoree;
  const aw = C.award;
  const indiv = C.individual;
  const cta = C.cta;
  const conf = C.confirmation;
  const pk = env.STRIPE_PUBLISHABLE_KEY || '';

  // ── Build tier cards ──
  const featured = C.tiers.filter(t => t.featured);
  const grid = C.tiers.filter(t => !t.featured);

  function tierCard(t, extraClass = '', delay = 3) {
    const featuresList = (t.features || []).map(f => `<li>${esc(f)}</li>`).join('');
    const highlight = t.highlight
      ? `<div class="da-tier-highlight"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>${esc(t.highlight)}</div>`
      : '';
    const buttonText = `Select ${esc(t.name)}`.split(' ').join('<br>');
    return `
      <div class="da-tier-card ${extraClass} da-tier-${esc(t.style)} da-anim da-d${delay}"
           data-tier="${esc(t.name)}" data-price="${t.price}" data-tables="${t.tables}"
           data-seats="${t.seats}" data-vip="${esc(t.vip)}" data-books="${t.books}" data-host="${t.host_seats}">
        <div class="da-tier-label">${esc(t.name)}</div>
        <div class="da-tier-price">$${money(t.price)}</div>
        <div class="da-tier-divider"></div>
        ${highlight}
        <ul class="da-tier-features">${featuresList}</ul>
        <button class="da-tier-select-btn" onclick="selectTier(this)">${buttonText}</button>
      </div>`;
  }

  const featuredHTML = featured.map(t => tierCard(t, 'da-tier-featured', 3)).join('');
  const gridHTML = grid.length
    ? `<div class="da-tiers-grid">${grid.map((t, i) => tierCard(t, '', Math.min(i + 3, 7))).join('')}</div>`
    : '';

  // ── Build honoree section ──
  const honoreeHTML = (hon.firstName || hon.lastName)
    ? `<section class="da-about">
        <div class="da-about-grid">
          <div class="da-about-photo-wrap da-anim">
            <div class="da-about-photo" style="${hon.photoUrl ? `background-image:url(${esc(hon.photoUrl)});` : ''} background-color:#ddd;"></div>
            <div class="da-about-photo-accent"></div>
          </div>
          <div class="da-about-body">
            <h2 class="da-anim da-d2">${esc(hon.firstName)} <span>${esc(hon.lastName)}</span></h2>
            ${hon.role ? `<p class="da-about-role da-anim da-d3">${esc(hon.role)}</p>` : ''}
            ${hon.bio ? `<div class="da-anim da-d4">${hon.bio}</div>` : ''}
          </div>
        </div>
      </section>`
    : '';

  // ── Build award section ──
  const awardHTML = (aw.description || aw.verse)
    ? `<section class="da-award-info">
        <div class="da-award-info-inner">
          <h2 class="da-anim">${esc(aw.title)}</h2>
          ${aw.description ? `<div class="da-anim da-d2">${aw.description}</div>` : ''}
          ${aw.verse ? `
            <div class="da-verse da-anim da-d3">
              <p>"${esc(aw.verse)}"</p>
              ${aw.verseRef ? `<cite>— ${esc(aw.verseRef)}</cite>` : ''}
            </div>` : ''}
        </div>
      </section>`
    : '';

  // ── Full page HTML ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(h.edition)} ${esc(h.awardName)} ${esc(h.subtitle)} | Arizona Christian University</title>
  <meta name="description" content="${esc(h.eyebrow)} — ${esc(h.edition)} ${esc(h.awardName)} ${esc(h.subtitle)}. ${esc(h.eventDate)} at ${esc(h.venueName)}.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://js.stripe.com/v3/"></script>
  <style>${CSS}</style>
</head>
<body>
<div class="da-page">

<!-- ══════════ HERO ══════════ -->
<section class="da-hero">
  <div class="da-hero-content">
    ${h.logoUrl ? `<img src="${esc(h.logoUrl)}" alt="${esc(h.awardName)}" class="da-hero-logo da-anim">` : ''}
    <p class="da-hero-eyebrow da-anim da-d2">${esc(h.eyebrow)}</p>
    <h1 class="da-anim da-d3">${esc(h.edition)} ${esc(h.awardName)}<span>${esc(h.subtitle)}</span></h1>
    ${h.honoreeLine ? `<div class="da-hero-honoree da-anim da-d4">${esc(h.honoreeLine)}</div>` : ''}
    ${h.quote ? `<p class="da-hero-quote da-anim da-d5">${esc(h.quote)}</p>` : ''}
    ${(h.eventDate || h.venueName) ? `
      <div class="da-hero-details da-anim da-d6">
        ${h.eventDate ? `<div class="da-hero-detail"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>${esc(h.eventDate)}</div>` : ''}
        ${(h.eventDate && h.venueName) ? '<div class="da-hero-divider"></div>' : ''}
        ${h.venueName ? `<div class="da-hero-detail"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>${esc(h.venueName)} &nbsp;·&nbsp; ${esc(h.venueLocation)}</div>` : ''}
      </div>` : ''}
  </div>
</section>

${honoreeHTML}
${awardHTML}

<!-- ══════════ SPONSORSHIP TIERS ══════════ -->
<section class="da-tiers" id="sponsorships">
  <div class="da-container">
    <h2 class="da-section-title da-anim">${esc(C.sponsorsTitle)}</h2>
    ${C.sponsorsIntro ? `<p class="da-section-intro da-anim da-d2">${esc(C.sponsorsIntro)}</p>` : ''}
    ${featuredHTML}
    ${gridHTML}

    <!-- Individual Seats -->
    <div class="da-individual-row da-anim da-d7">
      <div class="da-individual-info">
        <h3>${esc(indiv.label)} — $${money(indiv.price)} each</h3>
        <p>${esc(indiv.tagline)}</p>
      </div>
      <div class="da-individual-controls">
        <button class="da-qty-btn" onclick="changeQty(-1)">−</button>
        <span class="da-qty-display" id="seatQty">1</span>
        <button class="da-qty-btn" onclick="changeQty(1)">+</button>
        <button class="da-individual-select-btn" id="indivBtn" onclick="selectIndividual()">Select<br>Seats</button>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ REGISTRATION FORM ══════════ -->
<section class="da-form-section" id="register">
  <div class="da-container-narrow">
    <div class="da-form-wrap">
      <div class="da-form-header" id="formHeader">
        <h2>Complete Your Registration</h2>
        <p>${esc(h.eventDate)}${(h.eventDate && h.venueName) ? ' &nbsp;·&nbsp; ' : ''}${esc(h.venueName)}${h.venueLocation ? ', ' + esc(h.venueLocation) : ''}</p>
        <div class="da-form-summary" id="formSummary" style="display:none;">
          <span class="da-form-summary-tier" id="summaryTier"></span>
          <span style="color:rgba(255,255,255,0.3);">·</span>
          <span class="da-form-summary-price" id="summaryPrice"></span>
        </div>
      </div>

      <div class="da-form-body">
        <div class="da-form-empty" id="formEmpty">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <p>Select a sponsorship level or individual seats above to get started.</p>
        </div>

        <div id="formSteps" style="display:none;">
          <div class="da-steps">
            <div class="da-step da-step-active" id="stepInd1"><span class="da-step-num">1</span><span>Your Info</span></div>
            <div class="da-step-line"></div>
            <div class="da-step" id="stepInd2"><span class="da-step-num">2</span><span>Guests</span></div>
            <div class="da-step-line"></div>
            <div class="da-step" id="stepInd3"><span class="da-step-num">3</span><span>Review</span></div>
            <div class="da-step-line"></div>
            <div class="da-step" id="stepInd4"><span class="da-step-num">4</span><span>Payment</span></div>
          </div>

          <!-- STEP 1: YOUR INFO -->
          <div class="da-step-panel da-active" id="panel1">
            <div class="da-field-row">
              <div class="da-field"><label>First Name <span class="da-required">*</span></label><input type="text" id="firstName" placeholder="First name" required></div>
              <div class="da-field"><label>Last Name <span class="da-required">*</span></label><input type="text" id="lastName" placeholder="Last name" required></div>
            </div>
            <div class="da-field-row">
              <div class="da-field"><label>Email <span class="da-required">*</span></label><input type="email" id="email" placeholder="you@example.com" required></div>
              <div class="da-field"><label>Phone</label><input type="tel" id="phone" placeholder="(555) 123-4567"></div>
            </div>
            <div class="da-field-row"><div class="da-field da-field-full"><label>Organization / Company</label><input type="text" id="org" placeholder="Your organization"></div></div>
            <div class="da-field-row"><div class="da-field da-field-full"><label>Special Requests or Dietary Needs</label><textarea id="specialReqs" placeholder="Any special accommodations we should know about?"></textarea></div></div>
            <div class="da-form-nav">
              <div></div>
              <button class="da-btn da-btn-primary" onclick="goToStep(2)">Continue to Guest Names <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></button>
            </div>
          </div>

          <!-- STEP 2: GUEST NAMES -->
          <div class="da-step-panel" id="panel2">
            <div class="da-guests-section">
              <h3 class="da-guests-title">Guest Names</h3>
              <p class="da-guests-subtitle" id="guestsSubtitle">Enter the names for each seat at your table(s). You can update these later if needed.</p>
              <div id="guestTablesContainer"></div>
            </div>
            <div class="da-form-nav">
              <button class="da-btn da-btn-secondary" onclick="goToStep(1)"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
              <button class="da-btn da-btn-primary" onclick="goToStep(3)">Review Registration <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></button>
            </div>
          </div>

          <!-- STEP 3: REVIEW -->
          <div class="da-step-panel" id="panel3">
            <div id="reviewContent"></div>
            <div class="da-form-nav">
              <button class="da-btn da-btn-secondary" onclick="goToStep(2)"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
              <button class="da-btn da-btn-primary" onclick="goToStep(4)">Proceed to Payment <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></button>
            </div>
          </div>

          <!-- STEP 4: PAYMENT -->
          <div class="da-step-panel" id="panel4">
            <div class="da-pay-summary" id="paySummary"></div>
            <div class="da-pay-secure">
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              <p><strong>Secure payment</strong> — Your card information is encrypted and processed directly by Stripe. ACU never stores your payment details.</p>
            </div>
            <label class="da-pay-label">Payment Method</label>
            <div class="da-stripe-container da-stripe-loading" id="stripeContainer">
              <div id="stripeElement"></div>
            </div>
            <button class="da-pay-btn da-pay-btn-ready" id="payBtn" onclick="handlePayment()" disabled>
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              <span id="payBtnText">Complete Payment — $0</span>
            </button>
            <div class="da-pay-error" id="payError"><p id="payErrorText"></p></div>
            <div class="da-form-nav" style="border-top:none;margin-top:1.5rem;padding-top:0;">
              <button class="da-btn da-btn-secondary" onclick="goToStep(3)"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back to Review</button>
              <div></div>
            </div>
            <div class="da-pay-footer">
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              <span>Powered by Stripe · 256-bit encryption</span>
            </div>
          </div>
        </div>

        <!-- CONFIRMATION -->
        <div class="da-confirmation" id="confirmationState">
          <div class="da-conf-check">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h3 class="da-conf-title">${esc(conf.title)}</h3>
          <p class="da-conf-text">${esc(conf.text)}</p>
          <div class="da-conf-detail-card" id="confDetails"></div>
          <p class="da-conf-ref" id="confRef"></p>
          <a href="${esc(C.homeUrl)}" class="da-conf-btn">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Return to ACU Home
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ CTA FOOTER ══════════ -->
<section class="da-cta">
  <div class="da-container-narrow">
    <h2 class="da-anim">${esc(cta.title)}</h2>
    ${cta.text ? `<p class="da-anim da-d2">${esc(cta.text)}</p>` : ''}
    <div class="da-cta-contact da-anim da-d3">
      <a href="mailto:${esc(cta.email)}"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>${esc(cta.email)}</a>
      <a href="tel:${esc(cta.phoneLink)}"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>${esc(cta.phone)}</a>
    </div>
  </div>
</section>

</div>

<script>
(function(){
var CONFIG={indivPrice:${indiv.price},indivMax:${indiv.max},hostDesc:${JSON.stringify(C.host.description)},hostShort:${JSON.stringify(C.host.short)}};
var STRIPE_PK=${JSON.stringify(pk)};
var API_URL='/api/payment';

var state={type:null,tier:null,tierName:'',price:0,tables:0,seats:0,vip:'',books:0,host:0,indivQty:1,currentStep:1};
var stripe,elements,paymentElement,clientSecret;

function selectTier(btn){
  var card=btn.closest('.da-tier-card');
  document.querySelectorAll('.da-tier-card').forEach(function(c){c.classList.remove('da-selected')});
  document.getElementById('indivBtn').classList.remove('da-active');
  document.querySelector('.da-individual-row').classList.remove('da-selected');
  card.classList.add('da-selected');
  state.type='tier';state.tier=card;state.tierName=card.dataset.tier;
  state.price=parseInt(card.dataset.price);state.tables=parseInt(card.dataset.tables);
  state.seats=parseInt(card.dataset.seats);state.vip=card.dataset.vip;
  state.books=parseInt(card.dataset.books);state.host=parseInt(card.dataset.host);
  resetPayment();showForm();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.selectTier=selectTier;

function selectIndividual(){
  document.querySelectorAll('.da-tier-card').forEach(function(c){c.classList.remove('da-selected')});
  document.getElementById('indivBtn').classList.add('da-active');
  document.querySelector('.da-individual-row').classList.add('da-selected');
  var qty=parseInt(document.getElementById('seatQty').textContent);
  state.type='individual';state.tier=null;state.tierName='Individual Seats';
  state.price=qty*CONFIG.indivPrice;state.tables=0;state.seats=qty;
  state.vip='';state.books=0;state.host=0;state.indivQty=qty;
  resetPayment();showForm();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.selectIndividual=selectIndividual;

function changeQty(d){
  var el=document.getElementById('seatQty'),qty=Math.max(1,Math.min(CONFIG.indivMax,parseInt(el.textContent)+d));
  el.textContent=qty;
  if(state.type==='individual'){state.indivQty=qty;state.seats=qty;state.price=qty*CONFIG.indivPrice;updateSummary();resetPayment();}
}
window.changeQty=changeQty;

function showForm(){
  document.getElementById('formEmpty').style.display='none';
  document.getElementById('formSteps').style.display='block';
  document.getElementById('formSummary').style.display='flex';
  document.getElementById('confirmationState').classList.remove('da-active');
  updateSummary();goToStep(1);
}
function updateSummary(){
  document.getElementById('summaryTier').textContent=state.tierName;
  document.getElementById('summaryPrice').textContent='$'+state.price.toLocaleString();
}

function goToStep(n){
  if(n>1&&state.currentStep===1){
    var fn=document.getElementById('firstName').value.trim(),ln=document.getElementById('lastName').value.trim(),em=document.getElementById('email').value.trim();
    if(!fn||!ln||!em){alert('Please fill in your first name, last name, and email before continuing.');return;}
  }
  state.currentStep=n;
  [1,2,3,4].forEach(function(s){
    var p=document.getElementById('panel'+s),ind=document.getElementById('stepInd'+s);
    if(p)p.classList.toggle('da-active',s===n);
    if(ind)ind.className='da-step'+(s===n?' da-step-active':s<n?' da-step-done':'');
  });
  if(n===2)buildGuestFields();
  if(n===3)buildReview();
  if(n===4)initPaymentStep();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.goToStep=goToStep;

function buildGuestFields(){
  var c=document.getElementById('guestTablesContainer');c.innerHTML='';
  var vipTotal=state.vip==='all'?999:parseInt(state.vip||'0'),showVip=state.type==='tier'&&vipTotal>0;
  function mkRow(num,tid,vip,gold){
    var r=document.createElement('div');r.className='da-guest-row';
    var ns=gold?'background:rgba(212,168,67,0.15);color:var(--acu-gold);':'';
    var vh=vip?'<label class="da-vip-check" data-table="'+tid+'" data-seat="'+num+'"><input type="checkbox" onchange="updateVipCount()"><span class="da-vip-check-box"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span><span class="da-vip-check-label">VIP</span></label>':'';
    r.innerHTML='<span class="da-guest-num" style="'+ns+'">'+num+'</span><input type="text" placeholder="First name" data-table="'+tid+'" data-seat="'+num+'" data-field="first"><input type="text" placeholder="Last name" data-table="'+tid+'" data-seat="'+num+'" data-field="last">'+vh;
    return r;
  }
  if(state.type==='tier'){
    if(state.host>0){
      var hg=document.createElement('div');hg.className='da-table-group';hg.style.borderLeft='4px solid var(--acu-gold)';
      hg.innerHTML='<div class="da-table-group-title" style="color:var(--acu-gold);"><svg viewBox="0 0 24 24" style="fill:var(--acu-gold);"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>Host Table Seats — '+CONFIG.hostShort+'</div>';
      var hn=document.createElement('div');hn.className='da-vip-note';hn.style.marginTop='0';hn.style.marginBottom='1rem';
      hn.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><p>These <strong>'+state.host+' guests will be seated at the host table</strong> '+CONFIG.hostDesc+'. Host table guests automatically receive VIP Reception access.</p>';
      hg.appendChild(hn);
      for(var s=1;s<=state.host;s++)hg.appendChild(mkRow(s,'host',false,true));
      c.appendChild(hg);
    }
    if(showVip&&state.vip!=='all'){
      var vc=document.createElement('div');vc.className='da-vip-counter';vc.id='vipCounter';
      vc.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><p>VIP Reception passes: <span class="da-vip-count-num" id="vipUsed">0</span> of <strong>'+vipTotal+'</strong> assigned</p>';
      c.appendChild(vc);
    }else if(state.vip==='all'){
      var vc2=document.createElement('div');vc2.className='da-vip-counter';
      vc2.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><p><strong>All guests</strong> receive VIP Reception access at this sponsorship level</p>';
      c.appendChild(vc2);
    }
    for(var t=0;t<state.tables;t++){
      var g=document.createElement('div');g.className='da-table-group';
      var tt=state.tables>1?'Table '+(t+1)+' of '+state.tables:'Your Table';
      g.innerHTML='<div class="da-table-group-title"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'+tt+' — 10 Seats</div>';
      var needsVip=showVip&&state.vip!=='all';
      for(var s2=1;s2<=10;s2++)g.appendChild(mkRow(s2,String(t),needsVip,false));
      c.appendChild(g);
    }
  }else{
    var qty=state.indivQty;
    document.getElementById('guestsSubtitle').textContent='Enter the name for each of your '+qty+' seat'+(qty>1?'s':'')+'.';
    var ig=document.createElement('div');ig.className='da-table-group';
    ig.innerHTML='<div class="da-table-group-title"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Your Seats — '+qty+' Guest'+(qty>1?'s':'')+'</div>';
    for(var s3=1;s3<=qty;s3++)ig.appendChild(mkRow(s3,'0',false,false));
    c.appendChild(ig);
  }
}

function updateVipCount(){
  var lim=state.vip==='all'?999:parseInt(state.vip),cbs=document.querySelectorAll('.da-vip-check input[type="checkbox"]'),cnt=0;
  cbs.forEach(function(cb){if(cb.checked)cnt++;});
  var cel=document.getElementById('vipUsed');if(cel)cel.textContent=cnt;
  cbs.forEach(function(cb){var l=cb.closest('.da-vip-check');
    if(!cb.checked&&cnt>=lim){l.classList.add('da-vip-disabled');cb.disabled=true;}
    else{l.classList.remove('da-vip-disabled');cb.disabled=false;}
  });
}
window.updateVipCount=updateVipCount;

function buildReview(){
  var el=document.getElementById('reviewContent');
  var fn=document.getElementById('firstName').value||'—',ln=document.getElementById('lastName').value||'—';
  var em=document.getElementById('email').value||'—',ph=document.getElementById('phone').value||'—';
  var og=document.getElementById('org').value||'—';
  var inputs=document.querySelectorAll('#guestTablesContainer input[type="text"]'),guests={};
  inputs.forEach(function(inp){var k=inp.dataset.table+'-'+inp.dataset.seat;if(!guests[k])guests[k]={first:'',last:'',table:inp.dataset.table,seat:inp.dataset.seat,vip:false};guests[k][inp.dataset.field]=inp.value;});
  document.querySelectorAll('.da-vip-check input:checked').forEach(function(cb){var l=cb.closest('.da-vip-check'),k=l.dataset.table+'-'+l.dataset.seat;if(guests[k])guests[k].vip=true;});
  Object.values(guests).forEach(function(g){if(g.table==='host')g.vip=true;});
  if(state.vip==='all')Object.values(guests).forEach(function(g){g.vip=true;});
  var hg=Object.values(guests).filter(function(g){return g.table==='host'&&(g.first||g.last)});
  var tg=Object.values(guests).filter(function(g){return g.table!=='host'&&(g.first||g.last)});
  var rv='<div class="da-review-block"><h4>Registration Details</h4>';
  rv+='<div class="da-review-row"><span class="da-review-label">Sponsorship</span><span class="da-review-value">'+state.tierName+'</span></div>';
  rv+='<div class="da-review-row"><span class="da-review-label">Name</span><span class="da-review-value">'+fn+' '+ln+'</span></div>';
  rv+='<div class="da-review-row"><span class="da-review-label">Email</span><span class="da-review-value">'+em+'</span></div>';
  rv+='<div class="da-review-row"><span class="da-review-label">Phone</span><span class="da-review-value">'+ph+'</span></div>';
  if(og!=='—')rv+='<div class="da-review-row"><span class="da-review-label">Organization</span><span class="da-review-value">'+og+'</span></div>';
  rv+='<div class="da-review-row da-review-total"><span class="da-review-label">Total</span><span class="da-review-value">$'+state.price.toLocaleString()+'</span></div></div>';
  if(hg.length)rv+='<div class="da-review-block"><h4>Host Table Guests</h4><div class="da-review-guests">'+hg.map(function(g){return '<div class="da-review-guest"><span>Seat '+g.seat+':</span> '+g.first+' '+g.last+' <span style="color:var(--acu-gold);font-size:0.8rem;font-weight:700;">★ VIP</span></div>'}).join('')+'</div></div>';
  if(tg.length)rv+='<div class="da-review-block"><h4>Table Guest List ('+tg.length+' entered)</h4><div class="da-review-guests">'+tg.map(function(g){return '<div class="da-review-guest"><span>'+(state.tables>1?'T'+(parseInt(g.table)+1)+' ':'')+'Seat '+g.seat+':</span> '+g.first+' '+g.last+(g.vip?' <span style="color:var(--acu-gold);font-size:0.8rem;font-weight:700;">★ VIP</span>':'')+'</div>'}).join('')+'</div></div>';
  el.innerHTML=rv;
}

function initPaymentStep(){
  var s=document.getElementById('paySummary'),fn=document.getElementById('firstName').value,ln=document.getElementById('lastName').value;
  s.innerHTML='<div class="da-pay-summary-row"><span class="da-pay-summary-label">'+state.tierName+'</span><span class="da-pay-summary-value">'+state.seats+' seat'+(state.seats>1?'s':'')+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Registrant</span><span class="da-pay-summary-value">'+fn+' '+ln+'</span></div><div class="da-pay-summary-divider"></div><div class="da-pay-summary-row da-pay-summary-total"><span class="da-pay-summary-label">Total Due</span><span class="da-pay-summary-value">$'+state.price.toLocaleString()+'</span></div>';
  document.getElementById('payBtnText').textContent='Complete Payment — $'+state.price.toLocaleString();
  if(!clientSecret)createPaymentIntent();
}

async function createPaymentIntent(){
  var container=document.getElementById('stripeContainer');
  container.classList.add('da-stripe-loading');
  document.getElementById('payBtn').disabled=true;
  hidePayError();
  try{
    var res=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        amount:state.price,
        tier:state.tierName,
        firstName:document.getElementById('firstName').value,
        lastName:document.getElementById('lastName').value,
        email:document.getElementById('email').value,
        phone:document.getElementById('phone').value,
        org:document.getElementById('org').value,
        seats:state.seats
      })
    });
    var result=await res.json();
    if(result.error)throw new Error(result.error);
    clientSecret=result.clientSecret;
    if(!stripe)stripe=Stripe(STRIPE_PK);
    var appearance={
      theme:'night',
      variables:{colorPrimary:'#C8372D',colorBackground:'#ffffff',colorText:'#1A1A1A',colorDanger:'#E85A50',fontFamily:'Montserrat, system-ui, sans-serif',spacingUnit:'4px',borderRadius:'10px',fontSizeBase:'15px'},
      rules:{'.Input':{border:'2px solid #e0e0e0',boxShadow:'none',padding:'12px'},'.Input:focus':{border:'2px solid #C8372D',boxShadow:'0 0 0 3px rgba(200,55,45,0.1)'},'.Label':{fontWeight:'600',marginBottom:'6px'},'.Tab':{border:'2px solid #e0e0e0',borderRadius:'10px'},'.Tab--selected':{border:'2px solid #C8372D',backgroundColor:'rgba(200,55,45,0.04)'}}
    };
    elements=stripe.elements({clientSecret:clientSecret,appearance:appearance,fonts:[{cssSrc:'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap'}]});
    paymentElement=elements.create('payment',{layout:{type:'tabs',defaultCollapsed:false}});
    container.classList.remove('da-stripe-loading');
    paymentElement.mount('#stripeElement');
    paymentElement.on('ready',function(){document.getElementById('payBtn').disabled=false;});
    paymentElement.on('change',function(e){if(e.error)showPayError(e.error.message);else hidePayError();});
  }catch(err){
    container.classList.remove('da-stripe-loading');
    showPayError(err.message||'Unable to load payment form. Please try again.');
  }
}

function resetPayment(){
  clientSecret=null;
  if(paymentElement){paymentElement.destroy();paymentElement=null;}
  elements=null;
  var c=document.getElementById('stripeContainer');
  if(c){c.classList.add('da-stripe-loading');document.getElementById('stripeElement').innerHTML='';}
}

async function handlePayment(){
  var btn=document.getElementById('payBtn');
  btn.disabled=true;btn.className='da-pay-btn da-pay-btn-processing';
  btn.innerHTML='<span class="da-pay-btn-spinner"></span><span>Processing payment…</span>';
  hidePayError();
  var lockSvg='<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
  try{
    var r=await stripe.confirmPayment({elements:elements,confirmParams:{receipt_email:document.getElementById('email').value,payment_method_data:{billing_details:{name:document.getElementById('firstName').value+' '+document.getElementById('lastName').value,email:document.getElementById('email').value,phone:document.getElementById('phone').value}}},redirect:'if_required'});
    if(r.error){
      showPayError(r.error.message);
      btn.disabled=false;btn.className='da-pay-btn da-pay-btn-ready';
      btn.innerHTML=lockSvg+'<span id="payBtnText">Complete Payment — $'+state.price.toLocaleString()+'</span>';
      return;
    }
    if(r.paymentIntent&&r.paymentIntent.status==='succeeded')showConfirmation(r.paymentIntent.id);
  }catch(err){
    showPayError('An unexpected error occurred. Please try again.');
    btn.disabled=false;btn.className='da-pay-btn da-pay-btn-ready';
    btn.innerHTML=lockSvg+'<span id="payBtnText">Complete Payment — $'+state.price.toLocaleString()+'</span>';
  }
}
window.handlePayment=handlePayment;

function showPayError(m){document.getElementById('payErrorText').textContent=m;document.getElementById('payError').style.display='block';}
function hidePayError(){document.getElementById('payError').style.display='none';}

function showConfirmation(id){
  document.getElementById('formSteps').style.display='none';
  document.getElementById('formSummary').style.display='none';
  document.getElementById('formHeader').querySelector('h2').textContent='Registration Complete';
  var d=document.getElementById('confDetails');
  d.innerHTML='<div class="da-pay-summary-row"><span class="da-pay-summary-label">Sponsorship</span><span class="da-pay-summary-value">'+state.tierName+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Amount Paid</span><span class="da-pay-summary-value" style="color:var(--acu-green-light);">$'+state.price.toLocaleString()+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Email</span><span class="da-pay-summary-value">'+document.getElementById('email').value+'</span></div>';
  document.getElementById('confRef').textContent='Confirmation: '+id.replace('pi_','').substring(0,12).toUpperCase();
  document.getElementById('confirmationState').classList.add('da-active');
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}

var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('da-vis');});},{threshold:0.15});
document.querySelectorAll('.da-anim').forEach(function(el){obs.observe(el);});
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
