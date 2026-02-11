# Daniel Award — Cloudflare Worker Setup Guide

---

## Architecture

```
Browser ─── GET / ─────────────→ Cloudflare Worker ──→ Returns HTML page
        ─── POST /api/payment ──→ Cloudflare Worker ──→ Stripe API (PaymentIntent)
Stripe  ─── POST /api/webhook ──→ Cloudflare Worker ──→ Logs + custom hooks
```

No WordPress, no PHP, no server. The Worker runs at the edge on Cloudflare's global network.

---

## Project Structure

```
daniel-award-worker/
├── src/
│   ├── index.js      ← Main Worker (router, Stripe API, HTML template)
│   ├── config.js     ← All event content (edit this to update the page)
│   └── styles.js     ← CSS as JS export
├── wrangler.toml     ← Cloudflare Worker config
└── package.json      ← Scripts
```

---

## Step 1: Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free plan works)
- [Node.js](https://nodejs.org) 18+ installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- Stripe account with API keys

---

## Step 2: Authenticate Wrangler

```bash
npx wrangler login
```

This opens a browser to authorize Wrangler with your Cloudflare account.

---

## Step 3: Set Stripe Secrets

These are stored encrypted in Cloudflare — never in code:

```bash
cd daniel-award-worker

npx wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_test_... (or sk_live_...)

npx wrangler secret put STRIPE_PUBLISHABLE_KEY
# Paste: pk_test_... (or pk_live_...)

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_... (set up in Step 6)
```

---

## Step 4: Edit Event Content

Open `src/config.js` and fill in all event details:

- **Hero**: Award edition, honoree line, event date, venue
- **Honoree**: Name, role, bio, photo URL
- **Award**: Description, Bible verse
- **Tiers**: Pricing, seat counts, features, VIP allocations
- **CTA**: Contact email and phone

Every field has a comment explaining what it's for. After editing, deploy to see changes live.

---

## Step 5: Deploy

### Local development (test locally):
```bash
npx wrangler dev
```
Opens at `http://localhost:8787`. Stripe test cards work here.

### Deploy to production:
```bash
npx wrangler deploy
```

Your Worker will be live at: `https://daniel-award.<your-subdomain>.workers.dev`

---

## Step 6: Set Up Stripe Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://daniel-award.<your-subdomain>.workers.dev/api/webhook`
   (or your custom domain if configured)
3. Events to listen for: `payment_intent.succeeded`
4. Copy the **Signing secret** (`whsec_...`)
5. Set it: `npx wrangler secret put STRIPE_WEBHOOK_SECRET`

---

## Step 7: Custom Domain (Optional)

### Option A: Cloudflare-managed domain
If `arizonachristian.edu` DNS is on Cloudflare:

1. Dashboard → Workers & Pages → daniel-award → Settings → Triggers
2. Add Custom Domain: `daniel-award.arizonachristian.edu`
3. Cloudflare handles DNS + SSL automatically

### Option B: Workers Route
Add to `wrangler.toml`:
```toml
routes = [
  { pattern = "daniel-award.arizonachristian.edu/*", zone_name = "arizonachristian.edu" }
]
```

### Option C: Use the free `.workers.dev` subdomain
No setup needed — it works immediately after deploy.

---

## Test Cards

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 9995` | Declined |

Use any future expiry, any CVC, any ZIP.

---

## Going Live Checklist

- [ ] Fill in all event content in `src/config.js`
- [ ] Upload honoree photo and logo to a CDN / Cloudflare Images / S3
- [ ] Replace test Stripe keys with live keys: `npx wrangler secret put STRIPE_SECRET_KEY` (with `sk_live_...`)
- [ ] Create a **live** webhook endpoint in Stripe (test and live are separate)
- [ ] Update webhook secret: `npx wrangler secret put STRIPE_WEBHOOK_SECRET`
- [ ] Deploy: `npx wrangler deploy`
- [ ] Test with a real card, then refund from Stripe Dashboard
- [ ] Set up custom domain if desired

---

## Optional: Email Notifications

Add email notifications on payment by using a service like:

- **Cloudflare Email Workers** (if your domain is on Cloudflare)
- **Resend** or **SendGrid** API calls from the webhook handler
- **Zapier** webhook → email

To add: modify the `handleWebhook` function in `src/index.js` where the `payment_intent.succeeded` event is handled.

Example with Resend (add `RESEND_API_KEY` as a secret):

```javascript
// Inside handleWebhook, after logging:
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Daniel Award <noreply@arizonachristian.edu>',
    to: ['advancement@arizonachristian.edu'],
    subject: `New Registration: ${m.tier} — ${m.first_name} ${m.last_name}`,
    text: `New Daniel Award registration:\n\n${m.first_name} ${m.last_name}\n${m.email}\n${m.org}\n${m.tier}\n$${(intent.amount/100).toFixed(2)}`,
  }),
});
```

---

## Updating Event Content

1. Edit `src/config.js`
2. Run `npx wrangler deploy`
3. Changes are live globally within seconds

No WordPress admin, no cache clearing, no FTP uploads.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "Payment system not configured" | Secrets not set. Run `npx wrangler secret put STRIPE_SECRET_KEY` |
| Stripe Elements won't load | Check `STRIPE_PUBLISHABLE_KEY` secret is set correctly |
| Webhook returns 400 | Signing secret mismatch — regenerate and update |
| CORS errors | The Worker handles CORS automatically. Check browser console for details. |
| Page looks wrong | Clear browser cache. Check `src/styles.js` wasn't accidentally modified. |
| `wrangler deploy` fails | Run `npx wrangler login` to re-authenticate |

---

## Monitoring

- **Cloudflare Dashboard** → Workers & Pages → daniel-award → view requests, errors, latency
- **Stripe Dashboard** → Payments — all transactions with full metadata
- **Worker Logs**: `npx wrangler tail` (streams live console.log output)
