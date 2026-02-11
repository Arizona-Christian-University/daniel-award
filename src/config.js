// ═══════════════════════════════════════════════════════════
// DANIEL AWARD — EVENT CONFIGURATION
// Edit this file to update all page content.
// Replaces the ACF fields from the WordPress version.
// After editing, run: npx wrangler deploy
// ═══════════════════════════════════════════════════════════

export const CONFIG = {

  // ── Hero Section ──
  hero: {
    logoUrl:       '',  // URL to award logo image (leave empty to hide)
    eyebrow:       'Arizona Christian University Presents',
    edition:       '6th',
    awardName:     'Daniel Award',
    subtitle:      'for Courageous Public Faith',
    honoreeLine:   '', // e.g. "Honoring Governor Doug Ducey"
    quote:         '', // optional hero quote
    eventDate:     '', // e.g. "Thursday, November 13, 2025"
    venueName:     '', // e.g. "Arizona Biltmore"
    venueLocation: '', // e.g. "Phoenix, Arizona"
  },

  // ── Honoree Section ──
  honoree: {
    photoUrl:  '', // URL to honoree photo
    firstName: '', // e.g. "Doug"
    lastName:  '', // e.g. "Ducey"
    role:      '', // e.g. "48th Governor of Arizona"
    bio:       '', // HTML allowed — use <p> tags
  },

  // ── About the Award ──
  award: {
    title:       'About the Daniel Award',
    description: '', // HTML allowed
    verse:       '', // e.g. "But Daniel resolved not to defile himself..."
    verseRef:    '', // e.g. "Daniel 1:8, NIV"
  },

  // ── Sponsorship Tiers ──
  // style: 'event' | 'platinum' | 'gold' | 'silver' | 'bronze'
  // vip: 'all' | number string (e.g. '4') | '' (none)
  // featured: true = full-width card at top
  sponsorsTitle: 'Sponsorship & Seating',
  sponsorsIntro: 'Select your sponsorship level to begin registration.',
  tiers: [
    {
      name: 'Event Sponsor', price: 50000, style: 'event', featured: true,
      tables: 5, seats: 50, vip: 'all', books: 50, host_seats: 10,
      highlight: 'Premier Sponsorship',
      features: [
        '5 tables of 10 guests (50 seats)',
        '10 host table seats with honored guest',
        'VIP Reception access for all guests',
        'Premier event signage and recognition',
        '50 signed copies of honoree book',
        'Full-page program advertisement',
      ],
    },
    {
      name: 'Platinum Sponsor', price: 25000, style: 'platinum', featured: false,
      tables: 2, seats: 20, vip: '8', books: 20, host_seats: 4,
      highlight: '',
      features: [
        '2 tables of 10 (20 seats)', '4 host table seats',
        '8 VIP Reception passes', '20 signed books', 'Half-page program ad',
      ],
    },
    {
      name: 'Gold Sponsor', price: 15000, style: 'gold', featured: false,
      tables: 1, seats: 10, vip: '4', books: 10, host_seats: 2,
      highlight: '',
      features: [
        '1 table of 10 guests', '2 host table seats',
        '4 VIP Reception passes', '10 signed books', 'Quarter-page program ad',
      ],
    },
    {
      name: 'Silver Sponsor', price: 7500, style: 'silver', featured: false,
      tables: 1, seats: 10, vip: '2', books: 10, host_seats: 0,
      highlight: '',
      features: [
        '1 table of 10 guests', '2 VIP Reception passes',
        '10 signed books', 'Program recognition',
      ],
    },
    {
      name: 'Bronze Sponsor', price: 2500, style: 'bronze', featured: false,
      tables: 0, seats: 4, vip: '', books: 4, host_seats: 0,
      highlight: '',
      features: [
        '4 individual seats', '4 signed books', 'Program recognition',
      ],
    },
  ],

  // ── Individual Seats ──
  individual: {
    price: 250, label: 'Individual Seats',
    tagline: "Join us at this year's celebration", max: 20,
  },

  // ── Host Table ──
  host: {
    description: 'with the honoree and university leadership',
    short: 'VIP Reception Included',
  },

  // ── CTA Footer ──
  cta: {
    title: 'Questions About the Daniel Award?',
    text: 'Our advancement team is here to help with sponsorship details, seating arrangements, and event information.',
    email: 'advancement@arizonachristian.edu',
    phone: '1(602) 489-5300',
    phoneLink: '16024895300',
  },

  // ── Confirmation ──
  confirmation: {
    title: "You're Confirmed!",
    text: 'Thank you for your generous support of the Daniel Award. A receipt has been sent to your email. Our advancement team will follow up with event details and guest coordination.',
  },

  // ── Home URL ──
  homeUrl: 'https://arizonachristian.edu',
};
