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
      // Landing Page
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
        return serveLandingPage(env);
      }

      // Registration Page
      if (request.method === 'GET' && url.pathname === '/register') {
        return serveRegistrationPage(env);
      }

      // Create PaymentIntent
      if (request.method === 'POST' && url.pathname === '/api/payment') {
        return createPayment(request, env, cors);
      }

      // Stripe Webhook
      if (request.method === 'POST' && url.pathname === '/api/webhook') {
        return handleWebhook(request, env);
      }

      // Check Payment Registration
      if (request.method === 'POST' && url.pathname === '/register-check') {
        return handleCheckRegistration(request, env, cors);
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
  const { amount, tier, type, firstName, lastName, email, phone, org, seats, guests, notes } = body;

  if (!amount || amount < 1) return jsonResponse({ error: 'Invalid amount.' }, 400, cors);
  if (!email) return jsonResponse({ error: 'Email is required.' }, 400, cors);

  // Build Stripe form-encoded body
  const params = new URLSearchParams({
    'amount':                             String(amount * 100),
    'currency':                           'usd',
    'automatic_payment_methods[enabled]': 'true',
    'description':                        `Daniel Award — ${tier}`,
    'metadata[event]':                    'Daniel Award',
    'metadata[type]':                      type || 'tier',
    'metadata[tier]':                      tier || '',
    'metadata[seats]':                     String(seats || 0),
    'metadata[first_name]':                firstName || '',
    'metadata[last_name]':                 lastName || '',
    'metadata[email]':                     email,
    'metadata[phone]':                     phone || '',
    'metadata[org]':                        org || '',
    'metadata[guests]':                    (guests || '').substring(0, 500),
    'metadata[notes]':                     (notes || '').substring(0, 500),
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

    // Only process Daniel Award registrations
    if (m.event !== 'Daniel Award') {
      console.log(`[Webhook] Skipping non-Daniel Award payment: ${intent.id}`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[Daniel Award] Payment confirmed: ${intent.id} — ${m.first_name} ${m.last_name} (${m.email}) — $${(intent.amount / 100).toFixed(2)} — ${m.tier}`
    );

    // Prepare data for sheets and email
    const registrationData = {
      timestamp: new Date().toISOString(),
      type: m.type === 'individual' ? 'Individual Seats' : m.type === 'faculty' ? 'ACU Faculty & Staff' : 'Tier Sponsorship',
      packageName: m.tier || (m.type === 'faculty' ? 'ACU Faculty & Staff' : 'Individual Seats'),
      firstName: m.first_name || '',
      lastName: m.last_name || '',
      email: m.email || '',
      phone: m.phone || '',
      organization: m.org || '',
      notes: m.notes || '',
      amount: (intent.amount / 100).toFixed(2),
      stripeId: intent.id,
      seats: parseInt(m.seats || '0'),
      guestNames: m.guests || '',
    };

    // Write to Google Sheets
    try {
      await appendToGoogleSheet(env, registrationData);
    } catch (err) {
      console.error('[Daniel Award] Failed to write to Google Sheets:', err);
      // Don't fail the webhook even if Sheets fails
    }

    // Send email notification
    try {
      await sendEmailNotification(env, registrationData);
    } catch (err) {
      console.error('[Daniel Award] Failed to send email notification:', err);
      // Don't fail the webhook even if email fails
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════
// CHECK PAYMENT REGISTRATION
// ═══════════════════════════════════════════

async function handleCheckRegistration(request, env, cors) {
  try {
    const body = await request.json();
    const { type, firstName, lastName, email, phone, org, specialReqs, packageName, amount, tables, seats, vipSeats, books, hostSeats, guestNames, timestamp } = body;

    if (!email) return jsonResponse({ error: 'Email is required.' }, 400, cors);
    if (!amount || amount < 1) return jsonResponse({ error: 'Invalid amount.' }, 400, cors);

    console.log(
      `[Daniel Award - Check] Registration submitted: ${firstName} ${lastName} (${email}) — $${amount} — ${packageName}`
    );

    // Prepare data for sheets and email
    const registrationData = {
      timestamp: timestamp || new Date().toISOString(),
      type: type === 'individual' ? 'Individual Seats - Check Payment' : type === 'faculty' ? 'ACU Faculty & Staff - Check Payment' : 'Tier Sponsorship - Check Payment',
      packageName: packageName || '',
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      phone: phone || '',
      organization: org || '',
      notes: specialReqs || '',
      amount: amount.toString(),
      stripeId: 'CHECK-PENDING',
      seats: parseInt(seats || '0'),
      guestNames: guestNames || '',
      tables: parseInt(tables || '0'),
      vipSeats: vipSeats || '',
      books: parseInt(books || '0'),
      hostSeats: parseInt(hostSeats || '0'),
    };

    // Write to Google Sheets
    try {
      await appendToGoogleSheet(env, registrationData);
    } catch (err) {
      console.error('[Daniel Award - Check] Failed to write to Google Sheets:', err);
      return jsonResponse({ error: 'Failed to save registration.' }, 500, cors);
    }

    // Send email notification
    try {
      await sendEmailNotification(env, registrationData);
    } catch (err) {
      console.error('[Daniel Award - Check] Failed to send email notification:', err);
      // Don't fail the registration if email fails
    }

    return jsonResponse({ success: true }, 200, cors);
  } catch (err) {
    console.error('[Daniel Award - Check] Error:', err);
    return jsonResponse({ error: 'Registration failed.' }, 500, cors);
  }
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
// GOOGLE SHEETS INTEGRATION
// ═══════════════════════════════════════════

/**
 * Generate a JWT token for Google Sheets API authentication
 */
async function generateGoogleJWT(env) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: env.GOOGLE_SERVICE_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaims}`;

  // Import private key
  const privateKey = env.GOOGLE_PRIVATE_KEY;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length
  ).replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get access token from Google using JWT
 */
async function getGoogleAccessToken(env) {
  const jwt = await generateGoogleJWT(env);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * Append registration data to Google Sheet
 */
async function appendToGoogleSheet(env, data) {
  if (!env.GOOGLE_SHEET_ID || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SERVICE_EMAIL) {
    console.log('[Google Sheets] Missing configuration, skipping...');
    return;
  }

  const accessToken = await getGoogleAccessToken(env);

  // Parse guest data to extract details
  const guestLines = (data.guestNames || '').split('\n').filter(l => l.trim());
  const allGuests = guestLines.map(line => {
    const match = line.match(/^(\d+)\.\s*(.+?)\s*(?:\(VIP\))?$/);
    if (match) return match[2];
    return line.replace(/\(VIP\)/g, '').trim();
  }).filter(g => g);

  const vipGuests = guestLines.filter(l => l.includes('(VIP)')).map(line => {
    const match = line.match(/^(\d+)\.\s*(.+?)\s*\(VIP\)/);
    if (match) return match[2];
    return line.replace(/\(VIP\)/g, '').trim();
  }).filter(g => g);

  // Extract tier details from CONFIG
  const tierData = CONFIG.tiers.find(t => t.name === data.packageName);
  const tables = tierData ? tierData.tables : 0;
  const seats = data.seats || (tierData ? tierData.seats : allGuests.length);
  const vipAvailable = tierData ? (tierData.vip === 'all' ? 999 : parseInt(tierData.vip || '0')) : 0;

  const row = [
    data.timestamp,
    data.type,
    data.packageName,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.organization,
    data.notes,
    data.amount,
    data.stripeId,
    tables,
    seats,
    vipAvailable,
    vipGuests.length,
    allGuests.join('\n'),
    vipGuests.join('\n')
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Sheet1:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Sheets API error: ${error}`);
  }

  console.log('[Google Sheets] Successfully appended registration data');
}

/**
 * Base64 URL encode helper
 */
function base64UrlEncode(data) {
  let base64;
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    base64 = btoa(String.fromCharCode(...bytes));
  } else {
    base64 = btoa(data);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}


// ═══════════════════════════════════════════
// EMAIL NOTIFICATIONS
// ═══════════════════════════════════════════

/**
 * Send email notification via Resend
 */
async function sendEmailNotification(env, data) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_EMAILS) {
    console.log('[Email] Missing configuration, skipping...');
    return;
  }

  const recipients = env.NOTIFICATION_EMAILS.split(',').map(e => e.trim());
  const isCheckPayment = data.stripeId === 'CHECK-PENDING';

  // Parse guest names
  const guestLines = (data.guestNames || '').split('\n').filter(l => l.trim());
  const guestListHtml = guestLines.length > 0
    ? guestLines.map(g => `<li>${esc(g)}</li>`).join('')
    : '<li><em>No guests entered yet</em></li>';

  // Extract tier details
  const tierData = CONFIG.tiers.find(t => t.name === data.packageName);

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
    .content { background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; padding: 30px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 16px; font-weight: 700; color: #C8372D; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #C8372D; padding-bottom: 6px; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .info-label { font-weight: 600; color: #666; min-width: 140px; }
    .info-value { color: #1A1A1A; }
    .amount { font-size: 28px; font-weight: 900; color: #2E7D32; margin: 15px 0; }
    .guest-list { list-style: none; padding: 0; margin: 10px 0; }
    .guest-list li { padding: 6px 12px; background: #f5f5f5; margin: 4px 0; border-radius: 4px; font-size: 14px; }
    .badge { display: inline-block; background: #D4A843; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 6px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 New Daniel Award Registration</h1>
    <p>A payment has been successfully processed</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Registration Details</h2>
      <div class="info-row">
        <span class="info-label">Registration Type:</span>
        <span class="info-value"><strong>${esc(data.type)}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Package:</span>
        <span class="info-value"><strong>${esc(data.packageName)}</strong></span>
      </div>
      ${tierData && tierData.tables > 0 ? `
      <div class="info-row">
        <span class="info-label">Tables:</span>
        <span class="info-value">${tierData.tables}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Total Seats:</span>
        <span class="info-value">${data.seats || 0}</span>
      </div>
      ${tierData && tierData.vip ? `
      <div class="info-row">
        <span class="info-label">VIP Passes:</span>
        <span class="info-value">${tierData.vip === 'all' ? 'All guests' : tierData.vip}</span>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>Registrant Information</h2>
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">${esc(data.firstName)} ${esc(data.lastName)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value"><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone:</span>
        <span class="info-value">${esc(data.phone) || '—'}</span>
      </div>
      ${data.organization ? `
      <div class="info-row">
        <span class="info-label">Organization:</span>
        <span class="info-value">${esc(data.organization)}</span>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>Payment Information</h2>
      <div class="amount">$${parseFloat(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="info-row">
        <span class="info-label">Payment ID:</span>
        <span class="info-value"><code>${esc(data.stripeId)}</code></span>
      </div>
      <div class="info-row">
        <span class="info-label">Timestamp:</span>
        <span class="info-value">${new Date(data.timestamp).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}</span>
      </div>
    </div>

    ${guestLines.length > 0 ? `
    <div class="section">
      <h2>Guest List (${guestLines.length} guests)</h2>
      <ul class="guest-list">
        ${guestListHtml}
      </ul>
    </div>
    ` : ''}

    <div class="footer">
      <p>This is an automated notification from the Daniel Award registration system.</p>
      <p>View in <a href="https://dashboard.stripe.com/payments/${esc(data.stripeId)}">Stripe Dashboard</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
NEW DANIEL AWARD REGISTRATION
==============================

REGISTRATION DETAILS
--------------------
Type: ${data.type}
Package: ${data.packageName}
${tierData && tierData.tables > 0 ? `Tables: ${tierData.tables}\n` : ''}Total Seats: ${data.seats || 0}

REGISTRANT INFORMATION
----------------------
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone || '—'}
${data.organization ? `Organization: ${data.organization}\n` : ''}

PAYMENT INFORMATION
-------------------
Amount: $${parseFloat(data.amount).toFixed(2)}
Payment ID: ${data.stripeId}
Timestamp: ${new Date(data.timestamp).toLocaleString()}

${guestLines.length > 0 ? `
GUEST LIST (${guestLines.length} guests)
${guestLines.map(g => `• ${g}`).join('\n')}
` : ''}

---
This is an automated notification from the Daniel Award registration system.
  `;

  // Send internal notification
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Daniel Award <daniel-award@notify.arizonachristian.edu>',
      to: recipients,
      subject: `🎟️ New Registration: ${data.packageName} - ${data.firstName} ${data.lastName}`,
      html: htmlBody,
      text: textBody
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  const result = await response.json();
  console.log('[Email] Notification sent:', result.id);

  // Send confirmation to registrant
  const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
    .content { background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; padding: 30px; }
    .summary { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { font-weight: 600; color: #666; }
    .summary-value { color: #1A1A1A; font-weight: 600; }
    .amount { color: ${isCheckPayment ? '#D4A843' : '#2E7D32'}; font-size: 20px; }
    .message { background: ${isCheckPayment ? 'rgba(212,168,67,0.1)' : 'rgba(46,125,50,0.1)'}; border-left: 4px solid ${isCheckPayment ? '#D4A843' : '#2E7D32'}; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .message p { margin: 8px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isCheckPayment ? '📋 Registration Submitted' : '✅ Registration Confirmed'}</h1>
    <p>Daniel Award ${new Date().getFullYear()}</p>
  </div>

  <div class="content">
    <p>Dear ${esc(data.firstName)} ${esc(data.lastName)},</p>

    <p>Thank you for your generous support of the Daniel Award!</p>

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Sponsorship:</span>
        <span class="summary-value">${esc(data.packageName)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">${isCheckPayment ? 'Amount Due:' : 'Amount:'}</span>
        <span class="summary-value amount">$${parseFloat(data.amount).toLocaleString()}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Email:</span>
        <span class="summary-value">${esc(data.email)}</span>
      </div>
    </div>

    ${isCheckPayment ? `
    <div class="message">
      <p><strong>Payment Instructions:</strong></p>
      <p>Please mail your check to:</p>
      <p style="margin-left: 20px;">
        <strong>Arizona Christian University</strong><br>
        Office of Advancement<br>
        1 W Firestorm Way<br>
        Glendale, AZ 85306
      </p>
      <p>Make checks payable to <strong>Arizona Christian University</strong> and include <strong>"Daniel Award"</strong> in the memo line.</p>
      <p><strong>Important:</strong> Your sponsorship will be confirmed once we receive your check payment. Premier and preferred table positioning will be based on the order in which payment is received.</p>
    </div>
    ` : `
    <div class="message">
      <p><strong>Payment Received:</strong> Your payment has been successfully processed.</p>
      <p>A receipt will be processed by our Office of Advancement and sent to you separately.</p>
    </div>
    `}

    <p>Our advancement team will follow up with event details and guest coordination.</p>

    <p>If you have any questions, please contact us at <a href="mailto:advancement@arizonachristian.edu">advancement@arizonachristian.edu</a> or call (602) 489-5300.</p>

    <div class="footer">
      <p>Arizona Christian University<br>1 W Firestorm Way, Glendale, AZ 85306</p>
      <p>This is an automated confirmation email.</p>
    </div>
  </div>
</body>
</html>`;

  const confirmationResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Daniel Award <daniel-award@notify.arizonachristian.edu>',
      to: [data.email],
      subject: isCheckPayment
        ? `Registration Submitted - Daniel Award ${new Date().getFullYear()}`
        : `Registration Confirmed - Daniel Award ${new Date().getFullYear()}`,
      html: confirmationHtml
    })
  });

  if (!confirmationResponse.ok) {
    console.error('[Email] Failed to send confirmation to registrant');
  } else {
    const confirmResult = await confirmationResponse.json();
    console.log('[Email] Confirmation sent to registrant:', confirmResult.id);
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
// SERVE LANDING PAGE
// ═══════════════════════════════════════════

function serveLandingPage(env) {
  const C = CONFIG;
  const L = C.landing;

  // Build hero section
  const heroHTML = `
<section class="da-hero">
  ${L.hero.backgroundUrl ? `<div class="da-hero-bg" style="background-image: url(${esc(L.hero.backgroundUrl)});"></div>` : ''}
  <div class="da-hero-overlay"></div>
  <div class="da-hero-content">
    <img src="https://storage.googleapis.com/web.arizonachristian.edu/Photos/Daniel-Award-Red-Lion-Head.svg" alt="Daniel Award Logo" class="da-hero-award-logo da-anim">
    <span class="da-hero-badge da-anim da-d2">Arizona Christian University</span>
    <h1 class="da-anim da-d3">${esc(L.hero.title)}</h1>
    <p class="da-hero-sub da-anim da-d4">${esc(L.hero.subtitle)}</p>
    <a href="/register" class="da-hero-cta da-anim da-d5">
      Register Now
      <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
    </a>
  </div>
</section>`;

  // Build intro section
  const introHTML = L.intro ? `
<section class="da-intro">
  <div class="da-container-narrow">
    <p class="da-intro-text da-anim">${esc(L.intro)}</p>
  </div>
</section>` : '';

  // Build featured honoree section
  const featuredHTML = L.featured.enabled ? `
<section class="da-featured">
  <div class="da-container">
    <div class="da-featured-inner">
      <div class="da-featured-photo-wrap da-anim">
        <div class="da-featured-photo" style="${L.featured.photoUrl ? `background-image: url(${esc(L.featured.photoUrl)});` : ''}"></div>
      </div>
      <div class="da-featured-body">
        <span class="da-featured-year-badge da-anim da-d2">${esc(L.featured.year)} Honoree</span>
        <h2 class="da-featured-name da-anim da-d3">${esc(L.featured.name)}</h2>
        ${L.featured.bio ? `<p class="da-featured-bio da-anim da-d4">${esc(L.featured.bio)}</p>` : ''}
        ${(L.featured.eventDate || L.featured.eventLocation) ? `
        <div class="da-featured-meta da-anim da-d4">
          ${L.featured.eventDate ? `<div class="da-featured-meta-item"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg><span>${esc(L.featured.eventDate)}</span></div>` : ''}
          ${L.featured.eventLocation ? `<div class="da-featured-meta-item"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>${esc(L.featured.eventLocation)}</span></div>` : ''}
        </div>` : ''}
        ${L.featured.ctaUrl ? `<a href="${esc(L.featured.ctaUrl)}" class="da-featured-cta da-anim da-d5">${esc(L.featured.ctaLabel)}<svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></a>` : ''}
      </div>
    </div>
  </div>
</section>` : '';

  // Build recipients timeline
  const recipientsHTML = L.recipients && L.recipients.length > 0 ? `
<section class="da-recipients">
  <div class="da-container">
    <h2 class="da-section-title da-anim">Daniel Award Recipients</h2>
    <hr class="da-divider da-anim da-d2">
    <div class="da-timeline">
      ${L.recipients.map((r, i) => `
      <div class="da-timeline-item">
        <div class="da-timeline-content da-timeline-slide da-anim da-d${Math.min(i * 2 + 3, 9)}">
          ${r.photoUrl ? `<div class="da-timeline-photo da-timeline-photo-zoom" style="background-image: url(${esc(r.photoUrl)});"></div>` : ''}
          <div class="da-timeline-text">
            <p class="da-timeline-year">${esc(r.year)}</p>
            <p class="da-timeline-name">${esc(r.name)}</p>
            ${r.description ? `<p class="da-timeline-desc">${esc(r.description)}</p>` : ''}
          </div>
        </div>
        <div class="da-timeline-dot da-timeline-dot-pulse da-anim da-d${Math.min(i * 2 + 2, 8)}"></div>
        <div class="da-timeline-spacer"></div>
      </div>`).join('')}
    </div>
  </div>
</section>` : '';

  // Build inaugurated section
  const inaugHTML = L.inaugurated ? `
<section class="da-inaug">
  <div class="da-container-narrow">
    <img src="https://storage.googleapis.com/web.arizonachristian.edu/Photos/Daniel-Award-Black-Lion-Head.svg" alt="Daniel Award Logo" class="da-inaug-logo da-anim">
    <p class="da-inaug-text da-anim da-d2">${esc(L.inaugurated)}</p>
  </div>
</section>` : '';

  // Build CTA section (merged with about)
  const ctaHTML = `
<section class="da-cta" id="about">
  <div class="da-container">
    <div class="da-cta-grid">
      <div>
        <h2 class="da-anim" style="text-align:left;">${esc(L.about.title)}</h2>
        <hr class="da-divider da-anim da-d2" style="margin-left:0; background: linear-gradient(90deg, var(--acu-gold-dark), var(--acu-gold-light));">
        ${L.about.text ? `<p class="da-cta-text da-anim da-d3" style="text-align:left;">${esc(L.about.text)}</p>` : ''}
        ${L.ctaSection.buttons && L.ctaSection.buttons.length > 0 ? `
        <div class="da-cta-btns da-anim da-d4" style="justify-content:flex-start;">
          ${L.ctaSection.buttons.map((btn, i) => `<a href="${esc(btn.url)}" class="da-cta-btn ${btn.primary ? 'da-cta-btn-primary' : 'da-cta-btn-outline'}">${esc(btn.label)}</a>`).join('')}
        </div>` : ''}
      </div>
      ${(L.about.passage || L.about.scripture) ? `
      <div class="da-cta-scripture da-anim da-d4">
        ${L.about.passage ? `<p class="da-cta-scripture-passage">${esc(L.about.passage)}</p>` : ''}
        ${L.about.scripture ? `<p class="da-cta-scripture-ref">&mdash; ${esc(L.about.scripture)}</p>` : ''}
      </div>` : ''}
    </div>
  </div>
</section>`;

  // Full page HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(L.hero.title)} &mdash; ${esc(L.hero.subtitle)} | Arizona Christian University</title>
  <meta name="description" content="${esc(L.about.text.substring(0, 155))}">
  <link rel="icon" type="image/x-icon" href="https://azcu.edu/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
<div class="da-page">
${heroHTML}
${introHTML}
${featuredHTML}
${inaugHTML}
${recipientsHTML}
${ctaHTML}
</div>

<script>
(function(){
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('da-vis'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.da-anim').forEach(el => obs.observe(el));
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


// ═══════════════════════════════════════════
// SERVE REGISTRATION PAGE
// ═══════════════════════════════════════════

function serveRegistrationPage(env) {
  const C = CONFIG;
  const h = C.hero;
  const hon = C.honoree;
  const aw = C.award;
  const indiv = C.individual;
  const faculty = C.faculty;
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
    const buttonText = `Select<br>${esc(t.name)}`;
    return `
      <div class="da-tier-card ${extraClass} da-tier-${esc(t.style)} da-anim da-d${delay}"
           data-tier="${esc(t.name)}" data-price="${t.price}" data-tables="${t.tables}"
           data-seats="${t.seats}" data-vip="${esc(t.vip)}" data-books="${t.books}" data-host="${t.host_seats}">
        <div class="da-tier-price-group">
          <img src="https://storage.googleapis.com/web.arizonachristian.edu/Photos/Daniel-Award-Black-Lion-Head.svg" alt="Daniel Award" class="da-tier-logo">
          <div class="da-tier-label">${esc(t.name)}</div>
          <div class="da-tier-price">$${money(t.price)}</div>
        </div>
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
        <div class="da-about-container">
          <div class="da-about-photo-wrap da-anim">
            <div class="da-about-photo" style="${hon.photoUrl ? `background-image:url(${esc(hon.photoUrl)});` : ''} background-color:#ddd;"></div>
            <div class="da-about-photo-accent"></div>
          </div>
          <h2 class="da-anim da-d2">${esc(hon.firstName)} <span>${esc(hon.lastName)}</span></h2>
          ${hon.role ? `<p class="da-about-role da-anim da-d3">${hon.role}</p>` : ''}
          ${hon.bio ? `<div class="da-about-bio da-anim da-d4">${hon.bio}</div>` : ''}
          ${(h.eventDate || h.venueName) ? `
          <div class="da-about-event-info da-anim da-d5">
            <h3 class="da-about-event-title">Event Date & Location</h3>
            ${h.eventDate ? `<div class="da-about-event-item"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg><span>${esc(h.eventDate)}</span></div>` : ''}
            ${h.venueName ? `<div class="da-about-event-item"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>${esc(h.venueName)}, ${esc(h.venueLocation)}</span></div>` : ''}
          </div>` : ''}
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
  <link rel="icon" type="image/x-icon" href="https://azcu.edu/favicon.ico">
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
  ${h.logoUrl ? `<div class="da-hero-bg" style="background-image: url(${esc(h.logoUrl)});"></div>` : ''}
  <div class="da-hero-overlay"></div>
  <div class="da-hero-content">
    <img src="https://storage.googleapis.com/web.arizonachristian.edu/Photos/Daniel-Award-Red-Lion-Head.svg" alt="Daniel Award Logo" class="da-hero-award-logo da-anim">
    <span class="da-hero-badge da-anim da-d2">${esc(h.eyebrow)}</span>
    <h1 class="da-anim da-d3">${esc(h.awardName)}</h1>
    <p class="da-hero-sub da-anim da-d4">${esc(h.subtitle)}</p>
    <div class="da-hero-honoree da-anim da-d5">${esc(h.honoreeLine)}</div>
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
        <button class="da-individual-select-btn" id="indivBtn" onclick="selectIndividual()">Select<br>Individual Seats</button>
      </div>
    </div>

    <!-- Faculty & Staff Seats -->
    <div class="da-individual-row da-anim da-d8">
      <div class="da-individual-info">
        <h3>${esc(faculty.label)} — $${money(faculty.price)} each</h3>
        <p>${esc(faculty.tagline)}</p>
      </div>
      <div class="da-individual-controls">
        <button class="da-qty-btn" onclick="changeFacultyQty(-1)">−</button>
        <span class="da-qty-display" id="facultySeatQty">1</span>
        <button class="da-qty-btn" onclick="changeFacultyQty(1)">+</button>
        <button class="da-individual-select-btn" id="facultyBtn" onclick="selectFaculty()">Select<br>Faculty & Staff</button>
      </div>
    </div>

    ${C.sponsorsMessage ? `
    <div class="da-sponsors-message da-anim da-d9">
      <p>${esc(C.sponsorsMessage)}</p>
    </div>` : ''}
  </div>
</section>

<!-- ══════════ REGISTRATION FORM ══════════ -->
<section class="da-form-section" id="register" style="display:none;">
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
            <div class="da-field-row"><div class="da-field da-field-full"><label>Special Requests</label><textarea id="specialReqs" placeholder="Any special requests or notes?"></textarea></div></div>
            <div class="da-form-nav">
              <div></div>
              <button class="da-btn da-btn-primary" onclick="goToStep(2)">Continue to Guest Names <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></button>
            </div>
          </div>

          <!-- STEP 2: GUEST NAMES -->
          <div class="da-step-panel" id="panel2">
            <div class="da-guests-section">
              <h3 class="da-guests-title">Guest Names (Optional)</h3>
              <p class="da-guests-subtitle" id="guestsSubtitle">You can provide guest names now or submit them later.</p>

              <div class="da-guest-toggle">
                <button type="button" class="da-guest-toggle-btn" onclick="toggleGuestNames()" id="guestToggleBtn">
                  <svg viewBox="0 0 24 24" class="da-toggle-icon"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                  <span>Add Guest Names Now</span>
                </button>
                <p class="da-guest-toggle-note">You can skip this step and provide names to our advancement team later.</p>
              </div>

              <div id="guestTablesContainer" style="display:none;"></div>
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

            <label class="da-pay-label">Select Payment Method</label>
            <div class="da-payment-method-selector">
              <label class="da-payment-method-option">
                <input type="radio" name="paymentMethod" value="card" checked onchange="togglePaymentMethod()">
                <div class="da-payment-method-content">
                  <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                  <span>Credit Card</span>
                </div>
              </label>
              <label class="da-payment-method-option">
                <input type="radio" name="paymentMethod" value="check" onchange="togglePaymentMethod()">
                <div class="da-payment-method-content">
                  <svg viewBox="0 0 24 24"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H3V6h18v12z M9 8h10v2H9zm0 4h6v2H9z"/></svg>
                  <span>Pay by Check</span>
                </div>
              </label>
            </div>

            <div id="cardPaymentSection">
              <div class="da-pay-secure">
                <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                <p><strong>Secure payment</strong> — Your card information is encrypted and processed directly by Stripe. ACU never stores your payment details.</p>
              </div>
              <label class="da-pay-label">Card Information</label>
              <div class="da-stripe-container da-stripe-loading" id="stripeContainer">
                <div id="stripeElement"></div>
              </div>
            </div>

            <div id="checkPaymentSection" style="display:none;">
              <div class="da-check-disclaimer">
                <svg viewBox="0 0 24 24"><path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                <div>
                  <p><strong>Check Payment</strong> — Check will be mailed. I understand that my sponsorship is not confirmed until payment is received by ACU, and that premier and preferred table positioning will be based on the order in which payment is received.</p>
                  <p style="margin-top:0.75rem;"><strong>Mail check to:</strong><br>Arizona Christian University<br>Office of Advancement<br>1 W Firestorm Way<br>Glendale, AZ 85306</p>
                </div>
              </div>
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
          <div class="da-conf-text" id="confText">${esc(conf.text)}</div>
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
    <h2 class="da-anim">${cta.title}</h2>
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
var CONFIG={indivPrice:${indiv.price},indivMax:${indiv.max},facultyPrice:${faculty.price},facultyMax:${faculty.max},hostDesc:${JSON.stringify(C.host.description)},hostShort:${JSON.stringify(C.host.short)}};
var STRIPE_PK=${JSON.stringify(pk)};
var API_URL='/api/payment';

var state={type:null,tier:null,tierName:'',price:0,tables:0,seats:0,vip:'',books:0,host:0,indivQty:1,currentStep:1};
var stripe,elements,paymentElement,clientSecret,stripeReady=false;

function selectTier(btn){
  var card=btn.closest('.da-tier-card');
  document.querySelectorAll('.da-tier-card').forEach(function(c){c.classList.remove('da-selected')});
  document.querySelectorAll('.da-individual-row').forEach(function(r){r.classList.remove('da-selected')});
  document.getElementById('indivBtn')?.classList.remove('da-active');
  document.getElementById('facultyBtn')?.classList.remove('da-active');
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
  document.querySelectorAll('.da-individual-row').forEach(function(r){r.classList.remove('da-selected')});
  document.getElementById('indivBtn').classList.add('da-active');
  document.getElementById('facultyBtn')?.classList.remove('da-active');
  document.querySelector('.da-individual-row').classList.add('da-selected');
  var qty=parseInt(document.getElementById('seatQty').textContent);
  state.type='individual';state.tier=null;state.tierName='Individual Seats';
  state.price=qty*CONFIG.indivPrice;state.tables=0;state.seats=qty;
  state.vip='';state.books=0;state.host=0;state.indivQty=qty;
  resetPayment();showForm();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.selectIndividual=selectIndividual;

function selectFaculty(){
  document.querySelectorAll('.da-tier-card').forEach(function(c){c.classList.remove('da-selected')});
  document.querySelectorAll('.da-individual-row').forEach(function(r){r.classList.remove('da-selected')});
  var rows = document.querySelectorAll('.da-individual-row');
  if(rows[1]) rows[1].classList.add('da-selected');
  document.getElementById('facultyBtn').classList.add('da-active');
  document.getElementById('indivBtn')?.classList.remove('da-active');
  var qty=parseInt(document.getElementById('facultySeatQty').textContent);
  state.type='faculty';state.tier=null;state.tierName='ACU Faculty & Staff';
  state.price=qty*CONFIG.facultyPrice;state.tables=0;state.seats=qty;
  state.vip='';state.books=0;state.host=0;state.indivQty=qty;
  resetPayment();showForm();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.selectFaculty=selectFaculty;

function changeQty(d){
  var el=document.getElementById('seatQty'),qty=Math.max(1,Math.min(CONFIG.indivMax,parseInt(el.textContent)+d));
  el.textContent=qty;
  if(state.type==='individual'){state.indivQty=qty;state.seats=qty;state.price=qty*CONFIG.indivPrice;updateSummary();resetPayment();}
}
window.changeQty=changeQty;

function changeFacultyQty(d){
  var el=document.getElementById('facultySeatQty'),qty=Math.max(1,Math.min(CONFIG.facultyMax,parseInt(el.textContent)+d));
  el.textContent=qty;
  if(state.type==='faculty'){state.indivQty=qty;state.seats=qty;state.price=qty*CONFIG.facultyPrice;updateSummary();resetPayment();}
}
window.changeFacultyQty=changeFacultyQty;

function showForm(){
  document.getElementById('register').style.display='block';
  document.getElementById('formEmpty').style.display='none';
  document.getElementById('formSteps').style.display='block';
  document.getElementById('formSummary').style.display='flex';
  document.getElementById('confirmationState').classList.remove('da-active');
  updateSummary();

  // Update guest names UI based on type
  if(state.type==='individual'||state.type==='faculty'){
    document.querySelector('.da-guests-title').textContent='Guest Names (Required)';
    document.querySelector('.da-guests-subtitle').textContent='Please provide the name for each guest.';
    document.querySelector('.da-guest-toggle').style.display='none';
    buildGuestFields();
    document.getElementById('guestTablesContainer').style.display='block';
  }else{
    document.querySelector('.da-guests-title').textContent='Guest Names (Optional)';
    document.querySelector('.da-guests-subtitle').textContent='You can provide guest names now or submit them later.';
    document.querySelector('.da-guest-toggle').style.display='block';
    document.getElementById('guestTablesContainer').style.display='none';
  }

  goToStep(1);
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

  // Validate guest names for individual seats when moving from step 2 to 3
  if(n>2&&state.currentStep===2&&(state.type==='individual'||state.type==='faculty')){
    var inputs=document.querySelectorAll('#guestTablesContainer input[type="text"]');
    var allFilled=true;
    inputs.forEach(function(inp){
      if(!inp.value.trim())allFilled=false;
    });
    if(!allFilled){
      alert('Please provide names for all guests before continuing.');
      return;
    }
  }

  state.currentStep=n;
  [1,2,3,4].forEach(function(s){
    var p=document.getElementById('panel'+s),ind=document.getElementById('stepInd'+s);
    if(p)p.classList.toggle('da-active',s===n);
    if(ind)ind.className='da-step'+(s===n?' da-step-active':s<n?' da-step-done':'');
  });
  if(n===3)buildReview();
  if(n===4)initPaymentStep();
  document.getElementById('register').scrollIntoView({behavior:'smooth',block:'start'});
}
window.goToStep=goToStep;

function toggleGuestNames(){
  var container=document.getElementById('guestTablesContainer');
  var toggle=document.getElementById('guestToggleBtn');
  var toggleSection=document.querySelector('.da-guest-toggle');
  if(container.style.display==='none'||container.style.display===''){
    buildGuestFields();
    container.style.display='block';
    toggleSection.style.display='none';
  }else{
    container.style.display='none';
    toggleSection.style.display='block';
  }
}
window.toggleGuestNames=toggleGuestNames;

function buildGuestFields(){
  var c=document.getElementById('guestTablesContainer');c.innerHTML='';
  var vipTotal=state.vip==='all'?999:parseInt(state.vip||'0'),showVip=state.type==='tier'&&vipTotal>0;
  var allowSkip=state.type==='tier';
  function mkRow(num,tid,vip,gold){
    var r=document.createElement('div');r.className='da-guest-row';
    var ns=gold?'background:rgba(212,168,67,0.15);color:var(--acu-gold);':'';
    var vh=vip?'<label class="da-vip-check" data-table="'+tid+'" data-seat="'+num+'"><input type="checkbox" onchange="updateVipCount()"><span class="da-vip-check-box"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span><span class="da-vip-check-label">VIP</span></label>':'';
    var skipHtml=allowSkip?'<label class="da-skip-check" data-table="'+tid+'" data-seat="'+num+'"><input type="checkbox" onchange="toggleSkipGuest(this)"><span class="da-skip-check-label">Add later</span></label>':'';
    r.innerHTML='<span class="da-guest-num" style="'+ns+'">'+num+'</span><input type="text" placeholder="First name" data-table="'+tid+'" data-seat="'+num+'" data-field="first"><input type="text" placeholder="Last name" data-table="'+tid+'" data-seat="'+num+'" data-field="last">'+skipHtml+vh;
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
    if(state.tables>0){
      for(var t=0;t<state.tables;t++){
        var g=document.createElement('div');g.className='da-table-group';
        var tt=state.tables>1?'Table '+(t+1)+' of '+state.tables:'Your Table';
        g.innerHTML='<div class="da-table-group-title"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'+tt+' — 10 Seats</div>';
        var needsVip=showVip&&state.vip!=='all';
        for(var s2=1;s2<=10;s2++)g.appendChild(mkRow(s2,String(t),needsVip,false));
        c.appendChild(g);
      }
    }else if(state.seats>0){
      var ig=document.createElement('div');ig.className='da-table-group';
      ig.innerHTML='<div class="da-table-group-title"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Your Seats — '+state.seats+' Guest'+(state.seats>1?'s':'')+'</div>';
      for(var s3=1;s3<=state.seats;s3++)ig.appendChild(mkRow(s3,'0',false,false));
      c.appendChild(ig);
    }
  }else{
    var qty=state.indivQty;
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
  cbs.forEach(function(cb){
    var l=cb.closest('.da-vip-check');
    var row=cb.closest('.da-guest-row');
    if(!cb.checked&&cnt>=lim){l.classList.add('da-vip-disabled');cb.disabled=true;}
    else{l.classList.remove('da-vip-disabled');cb.disabled=false;}
    // Highlight row when VIP is checked
    if(cb.checked){row.classList.add('da-guest-vip');}
    else{row.classList.remove('da-guest-vip');}
  });
}
window.updateVipCount=updateVipCount;

function toggleSkipGuest(checkbox){
  var row=checkbox.closest('.da-guest-row');
  var inputs=row.querySelectorAll('input[type="text"]');
  if(checkbox.checked){
    row.classList.add('da-guest-skipped');
    inputs.forEach(function(inp){
      inp.disabled=true;
      inp.value='';
    });
  }else{
    row.classList.remove('da-guest-skipped');
    inputs.forEach(function(inp){
      inp.disabled=false;
    });
  }
}
window.toggleSkipGuest=toggleSkipGuest;

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
  if(!hg.length&&!tg.length)rv+='<div class="da-review-block"><h4>Guest Names</h4><p style="color:rgba(255,255,255,0.5);font-style:italic;">Guest names will be provided later to the advancement team.</p></div>';
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
    // Collect guest names
    var inputs=document.querySelectorAll('#guestTablesContainer input[type="text"]'),guests={};
    inputs.forEach(function(inp){var k=inp.dataset.table+'-'+inp.dataset.seat;if(!guests[k])guests[k]={first:'',last:'',table:inp.dataset.table,seat:inp.dataset.seat,vip:false};guests[k][inp.dataset.field]=inp.value;});
    document.querySelectorAll('.da-vip-check input:checked').forEach(function(cb){var l=cb.closest('.da-vip-check'),k=l.dataset.table+'-'+l.dataset.seat;if(guests[k])guests[k].vip=true;});
    Object.values(guests).forEach(function(g){if(g.table==='host')g.vip=true;});
    if(state.vip==='all')Object.values(guests).forEach(function(g){g.vip=true;});
    var guestList=Object.values(guests).filter(function(g){return g.first||g.last;}).map(function(g,i){return(i+1)+'. '+g.first+' '+g.last+(g.vip?' (VIP)':'');}).join('\\n');

    var res=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        amount:state.price,
        tier:state.tierName,
        type:state.type,
        firstName:document.getElementById('firstName').value,
        lastName:document.getElementById('lastName').value,
        email:document.getElementById('email').value,
        phone:document.getElementById('phone').value,
        org:document.getElementById('org').value,
        seats:state.seats,
        guests:guestList,
        notes:document.getElementById('specialReqs').value
      })
    });
    var result=await res.json();
    if(result.error)throw new Error(result.error);
    clientSecret=result.clientSecret;
    if(!stripe)stripe=Stripe(STRIPE_PK);
    var appearance={
      theme:'night',
      variables:{colorPrimary:'#C8372D',colorBackground:'rgba(255,255,255,0.05)',colorText:'#ffffff',colorDanger:'#E85A50',fontFamily:'Montserrat, system-ui, sans-serif',spacingUnit:'4px',borderRadius:'10px',fontSizeBase:'15px'},
      rules:{'.Input':{border:'2px solid rgba(255,255,255,0.1)',boxShadow:'none',padding:'12px',backgroundColor:'rgba(255,255,255,0.05)',color:'#ffffff'},'.Input:focus':{border:'2px solid #C8372D',boxShadow:'none'},'.Input::placeholder':{color:'rgba(255,255,255,0.25)'},'.Label':{fontWeight:'600',marginBottom:'6px',color:'rgba(255,255,255,0.6)'},'.Tab':{border:'2px solid rgba(255,255,255,0.1)',borderRadius:'10px',backgroundColor:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.7)'},'.Tab:hover':{backgroundColor:'rgba(255,255,255,0.06)',color:'#ffffff'},'.Tab--selected':{border:'2px solid #C8372D',backgroundColor:'rgba(200,55,45,0.1)',color:'#ffffff'},'.TabIcon--selected':{fill:'#C8372D'}}
    };
    elements=stripe.elements({clientSecret:clientSecret,appearance:appearance,fonts:[{cssSrc:'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap'}]});
    paymentElement=elements.create('payment',{layout:{type:'tabs',defaultCollapsed:false}});
    container.classList.remove('da-stripe-loading');
    paymentElement.mount('#stripeElement');
    paymentElement.on('ready',function(){stripeReady=true;var method=document.querySelector('input[name="paymentMethod"]:checked');if(method&&method.value==='card')document.getElementById('payBtn').disabled=false;});
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

function togglePaymentMethod(){
  var method=document.querySelector('input[name="paymentMethod"]:checked').value;
  var cardSection=document.getElementById('cardPaymentSection');
  var checkSection=document.getElementById('checkPaymentSection');
  var payBtn=document.getElementById('payBtn');
  var btnText=document.getElementById('payBtnText');

  if(method==='check'){
    cardSection.style.display='none';
    checkSection.style.display='block';
    payBtn.disabled=false;
    btnText.textContent='Submit Registration — $'+state.price.toLocaleString();
  }else{
    cardSection.style.display='block';
    checkSection.style.display='none';
    btnText.textContent='Complete Payment — $'+state.price.toLocaleString();
    payBtn.disabled=!stripeReady;
  }
}
window.togglePaymentMethod=togglePaymentMethod;

async function handlePayment(){
  var method=document.querySelector('input[name="paymentMethod"]:checked').value;

  if(method==='check'){
    return handleCheckPayment();
  }

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

function collectGuestNames(){
  var inputs=document.querySelectorAll('#guestTablesContainer input[type="text"]'),guests={};
  inputs.forEach(function(inp){var k=inp.dataset.table+'-'+inp.dataset.seat;if(!guests[k])guests[k]={first:'',last:'',table:inp.dataset.table,seat:inp.dataset.seat,vip:false};guests[k][inp.dataset.field]=inp.value;});
  document.querySelectorAll('.da-vip-check input:checked').forEach(function(cb){var l=cb.closest('.da-vip-check'),k=l.dataset.table+'-'+l.dataset.seat;if(guests[k])guests[k].vip=true;});
  Object.values(guests).forEach(function(g){if(g.table==='host')g.vip=true;});
  if(state.vip==='all')Object.values(guests).forEach(function(g){g.vip=true;});
  return Object.values(guests).filter(function(g){return g.first||g.last;}).map(function(g,i){return(i+1)+'. '+g.first+' '+g.last+(g.vip?' (VIP)':'');}).join('\\n');
}

async function handleCheckPayment(){
  var btn=document.getElementById('payBtn');
  btn.disabled=true;btn.className='da-pay-btn da-pay-btn-processing';
  btn.innerHTML='<span class="da-pay-btn-spinner"></span><span>Submitting registration…</span>';
  hidePayError();

  try{
    var data={
      firstName:document.getElementById('firstName').value,
      lastName:document.getElementById('lastName').value,
      email:document.getElementById('email').value,
      phone:document.getElementById('phone').value,
      org:document.getElementById('org').value,
      specialReqs:document.getElementById('specialReqs').value,
      type:state.type,
      packageName:state.tierName,
      amount:state.price,
      tables:state.tables,
      seats:state.seats,
      vipSeats:state.vip,
      books:state.books,
      hostSeats:state.hostSeats,
      guestNames:collectGuestNames(),
      timestamp:new Date().toISOString()
    };

    var response=await fetch('/register-check',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });

    if(!response.ok)throw new Error('Registration failed');

    showConfirmation('CHECK-PENDING');
  }catch(err){
    showPayError('Registration failed. Please try again.');
    btn.disabled=false;btn.className='da-pay-btn da-pay-btn-ready';
    btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><span id="payBtnText">Submit Registration — $'+state.price.toLocaleString()+'</span>';
  }
}

function showPayError(m){document.getElementById('payErrorText').textContent=m;document.getElementById('payError').style.display='block';}
function hidePayError(){document.getElementById('payError').style.display='none';}

function showConfirmation(id){
  document.getElementById('formSteps').style.display='none';
  document.getElementById('formSummary').style.display='none';

  var d=document.getElementById('confDetails');
  var confText=document.getElementById('confText');

  if(id==='CHECK-PENDING'){
    document.getElementById('formHeader').querySelector('h2').textContent='Registration Submitted';
    d.innerHTML='<div class="da-pay-summary-row"><span class="da-pay-summary-label">Sponsorship</span><span class="da-pay-summary-value">'+state.tierName+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Amount Due</span><span class="da-pay-summary-value" style="color:var(--acu-gold);">$'+state.price.toLocaleString()+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Email</span><span class="da-pay-summary-value">'+document.getElementById('email').value+'</span></div>';
    confText.innerHTML='<p>Thank you for registering! Your sponsorship will be confirmed once we receive your check payment.</p><p><strong>Please mail your check to:</strong><br>Arizona Christian University<br>Office of Advancement<br>1 W Firestorm Way<br>Glendale, AZ 85306</p><p>Make checks payable to <strong>Arizona Christian University</strong>. Please include "Daniel Award" in the memo line.</p><p>Premier and preferred table positioning will be based on the order in which payment is received. Our Office of Advancement will contact you at '+document.getElementById('email').value+' with event details.</p><p>A confirmation email has been sent to '+document.getElementById('email').value+'</p>';
    document.getElementById('confRef').textContent='Reference: CHECK-'+new Date().getTime().toString().substring(7);
  }else{
    document.getElementById('formHeader').querySelector('h2').textContent='Registration Complete';
    d.innerHTML='<div class="da-pay-summary-row"><span class="da-pay-summary-label">Sponsorship</span><span class="da-pay-summary-value">'+state.tierName+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Amount Paid</span><span class="da-pay-summary-value" style="color:var(--acu-green-light);">$'+state.price.toLocaleString()+'</span></div><div class="da-pay-summary-row"><span class="da-pay-summary-label">Email</span><span class="da-pay-summary-value">'+document.getElementById('email').value+'</span></div>';
    confText.innerHTML='<p>Thank you for your generous support of the Daniel Award.</p><p>A confirmation email has been sent to '+document.getElementById('email').value+'. A receipt will be processed by our Office of Advancement and sent to you separately.</p><p>Our Office of Advancement will follow up with event details and guest coordination.</p>';
    document.getElementById('confRef').textContent='Confirmation: '+id.replace('pi_','').substring(0,12).toUpperCase();
  }

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
