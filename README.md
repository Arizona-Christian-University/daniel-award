# Daniel Award Registration Platform

A serverless registration and payment platform for Arizona Christian University's Daniel Award, built on Cloudflare Workers.

## Features

- 🎟️ Multi-tier sponsorship registration
- 💳 Secure payment processing with Stripe
- 🚀 Deployed on Cloudflare's global edge network
- 📱 Responsive design
- 🔒 PCI-compliant (Stripe Elements)
- ⚡ Zero-downtime deployments via GitHub Actions

## Architecture

- **Cloudflare Workers** - Serverless compute at the edge
- **Stripe** - Payment processing and webhook handling
- **GitHub Actions** - Automated deployments

## Quick Start

See [SETUP-GUIDE.md](./SETUP-GUIDE.md) for detailed setup instructions.

### Local Development

```bash
npm run dev
```

### Deploy to Production

Deployments are automated via GitHub Actions when pushing to `main` branch.

Manual deployment:
```bash
npm run deploy
```

## Configuration

Edit event details in `src/config.js`:
- Event date, venue, honoree
- Sponsorship tiers and pricing
- Contact information

## Secrets Required

Set these in GitHub repository secrets:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers write permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_...)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_...)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (whsec_...)

## Project Structure

```
├── src/
│   ├── index.js      # Main worker (routing, Stripe, HTML)
│   ├── config.js     # Event configuration
│   └── styles.js     # CSS styling
├── .github/
│   └── workflows/
│       └── deploy.yml # GitHub Actions deployment
├── wrangler.toml     # Cloudflare Worker config
└── package.json      # Scripts
```

## License

© 2025 Arizona Christian University
