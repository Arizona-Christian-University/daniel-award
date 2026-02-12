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
    honoreeLine:   'Honoring Dr. George Barna',
    quote:         '', // optional hero quote
    eventDate:     '', // e.g. "Thursday, November 13, 2025"
    venueName:     '', // e.g. "Arizona Biltmore"
    venueLocation: '', // e.g. "Phoenix, Arizona"
  },

  // ── Honoree Section ──
  honoree: {
    photoUrl:  'https://storage.googleapis.com/web.arizonachristian.edu/Photos/Geroge-Barna.png',
    firstName: 'Dr. George',
    lastName:  'Barna',
    role:      'Director of Research, Cultural Research Center at Arizona Christian University',
    bio:       `<p>Arizona Christian University warmly invites you to an unforgettable evening celebrating courage, conviction, and faithfulness to biblical truth as we honor legendary social scientist and bestselling author George Barna with our 6th Daniel Award for Courageous Public Faith.</p>

    <p>For more than four decades, George Barna has stood at the forefront of understanding faith, culture, and the spiritual condition of America. An author, speaker, and pioneering public opinion researcher, Barna founded the Barna Research Group in 1984 and helped establish rigorous, data-driven research as a trusted tool for Christian ministries, churches, and leaders across the nation. His work has educated thousands of churches, major ministries, corporations, and government institutions, and has shaped countless conversations about worldview, discipleship, and cultural engagement.</p>

    <p>Barna is also one of the most prolific and influential Christian authors of our time. He has written more than 60 books, including numerous national bestsellers, addressing topics such as biblical worldview, parenting, spiritual formation, leadership, evangelism, and cultural trends. Millions of readers around the world have been challenged and encouraged by works such as <em>Revolution</em>, <em>Think Like Jesus</em>, <em>Raising Spiritual Champions</em>, and <em>The Power of Vision</em>. His research and writing have earned him a reputation as "the gold standard in Christian research" and one of the most quoted voices in the Christian Church today.</p>

    <p>Throughout his career, Barna has demonstrated uncommon courage by telling the truth about what is actually happening in the Church and in society—not to discourage believers, but to equip them. His life's mission has been to help Christians move beyond surface-level faith toward authentic discipleship rooted in Scripture, obedience, and transformation. Even when his findings have been misunderstood or resisted, he has remained steadfast, motivated by a deep love for Christ and for His Church.</p>

    <p>Today, Barna serves as a professor and Director of Research at the Cultural Research Center at Arizona Christian University, where his research offers a hopeful contrast to many national trends. His measurements show that ACU students grow stronger each year in their faith, biblical worldview, and commitment to conservative Christian beliefs and practices. Graduates of ACU are more likely to be spiritually mature than most adult Christian leaders—powerful evidence that intentional, Christ-centered education can shape lives and culture.</p>

    <p>Proceeds from this special evening will provide scholarships to help make an ACU education accessible and affordable for students called to transform culture with truth. We hope you will join us, invite others, and partner with us in honoring George Barna for his decades of committed leadership, while investing in the next generation of courageous Christian leaders!</p>`,
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
