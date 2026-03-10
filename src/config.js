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
    eyebrow:       'Arizona Christian University',
    edition:       '6th',
    awardName:     'The Daniel Award',
    subtitle:      'for Courageous Public Faith',
    honoreeLine:   'Honoring George Barna',
    quote:         '', // optional hero quote
    eventDate:     'Thursday, April 9, 2026', // e.g. "Thursday, November 13, 2025"
    venueName:     'Arizona Biltmore', // e.g. "Arizona Biltmore"
    venueLocation: '2400 E Missouri Ave, Phoenix, AZ 85016', // e.g. "Phoenix, Arizona"
  },

  // ── Honoree Section ──
  honoree: {
    photoUrl:  'https://storage.googleapis.com/web.arizonachristian.edu/Photos/George-Barna.png',
    firstName: 'George',
    lastName:  'Barna',
    role:      'Director of Research,<br>Cultural Research Center at Arizona Christian University',
    bio:       `<p>For more than four decades, George Barna has stood at the forefront of understanding faith, culture, and the spiritual condition of America. An author, speaker, and pioneering public opinion researcher, Barna founded the Barna Research Group in 1984 and helped establish rigorous, data-driven research as a trusted tool for Christian ministries, churches, and leaders across the nation. His work has educated thousands of churches, major ministries, corporations, and government institutions, and has shaped countless conversations about worldview, discipleship, and cultural engagement.</p>

    <p>Barna is also one of the most prolific and influential Christian authors of our time. He has written more than 60 books, including numerous national bestsellers, addressing topics such as biblical worldview, parenting, spiritual formation, leadership, evangelism, and cultural trends. Millions of readers around the world have been challenged and encouraged by works such as <em>Revolution</em>, <em>Think Like Jesus</em>, <em>Raising Spiritual Champions</em>, and <em>The Power of Vision</em>. His research and writing have earned him a reputation as "the gold standard in Christian research" and one of the most quoted voices in the Christian Church today.</p>

    <p>Throughout his career, Barna has demonstrated uncommon courage by telling the truth about what is actually happening in the Church and in society—not to discourage believers, but to equip them. His life's mission has been to help Christians move beyond surface-level faith toward authentic discipleship rooted in Scripture, obedience, and transformation. Even when his findings have been misunderstood or resisted, he has remained steadfast, motivated by a deep love for Christ and for His Church.</p>

    <p>Today, Barna serves as a professor and Director of Research at the Cultural Research Center at Arizona Christian University, where his research offers a hopeful contrast to many national trends. His measurements show that ACU students grow stronger each year in their faith, biblical worldview, and commitment to conservative Christian beliefs and practices. Graduates of ACU are more likely to be spiritually mature than most adult Christian leaders—powerful evidence that intentional, Christ-centered education can shape lives and culture.</p>`,
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
  sponsorsMessage: 'Proceeds from this special evening will provide scholarships to help make an ACU education accessible and affordable for students called to transform culture with truth. We hope you will join us, invite others, and partner with us in honoring George Barna for his decades of committed leadership, while investing in the next generation of courageous Christian leaders!',
  tiers: [
    {
      name: 'Event Sponsor', price: 50000, style: 'event', featured: true,
      tables: 2, seats: 20, vip: 'all', books: 10, host_seats: 2,
      highlight: 'Premier Sponsorship',
      features: [
        'Two premium location tables of 10',
        'Two seats at host table with Barnas and Munsils',
        'VIP Reception and photos for all guests',
        'Program and video screen recognition',
        '10 signed copies of Barna\'s latest bestseller, "Raising Spiritual Champions"',
      ],
    },
    {
      name: 'Platinum Sponsor', price: 25000, style: 'platinum', featured: false,
      tables: 1, seats: 10, vip: 'all', books: 5, host_seats: 2,
      highlight: '',
      features: [
        'Premium location table of 10',
        'Two seats at host table with Barnas and Munsils',
        'VIP Reception and photos for all guests',
        'Program and video screen recognition',
        '5 signed copies of Barna\'s latest bestseller, "Raising Spiritual Champions"',
      ],
    },
    {
      name: 'Gold Sponsor', price: 10000, style: 'gold', featured: false,
      tables: 1, seats: 10, vip: '6', books: 3, host_seats: 0,
      highlight: '',
      features: [
        'Premium location table of 10',
        'VIP Reception and photos for 6 guests',
        'Program and video screen recognition',
        '3 signed copies of Barna\'s latest bestseller, "Raising Spiritual Champions"',
      ],
    },
    {
      name: 'Silver Sponsor', price: 5000, style: 'silver', featured: false,
      tables: 1, seats: 10, vip: '4', books: 2, host_seats: 0,
      highlight: '',
      features: [
        'Preferred location table of 10',
        'VIP reception and photos for 4 guests',
        'Program and video screen recognition',
        '2 signed copies of Barna\'s latest bestseller, "Raising Spiritual Champions"',
      ],
    },
    {
      name: 'Bronze Sponsor', price: 2500, style: 'bronze', featured: false,
      tables: 1, seats: 10, vip: '2', books: 1, host_seats: 0,
      highlight: '',
      features: [
        'Preferred location table of 10',
        'VIP reception and photos for 2 guests',
        'Program and video screen recognition',
        'Signed copy of Barna\'s latest bestseller, "Raising Spiritual Champions"',
      ],
    },
  ],

  // ── Individual Seats ──
  individual: {
    price: 250, label: 'Individual Seats',
    tagline: "Join us at this year's celebration", max: 20,
  },

  // ── Faculty & Staff Seats ──
  faculty: {
    price: 150, label: 'ACU Faculty & Staff',
    tagline: "Special pricing for ACU employees", max: 20,
  },

  // ── Host Table ──
  host: {
    description: 'with the honoree and university leadership',
    short: 'VIP Reception Included',
  },

  // ── CTA Footer ──
  cta: {
    title: 'Questions about the<br>Daniel Award?',
    text: 'Our advancement team is here to help with sponsorship details, seating arrangements, and event information.',
    email: 'advancement@arizonachristian.edu',
    phone: '1(602) 489-5300',
    phoneLink: '16024895300',
  },

  // ── Confirmation ──
  confirmation: {
    title: "You're Confirmed!",
    text: 'Thank you for your generous support of Arizona Christian University and our Daniel Award dinner. A confirmation email has been sent to you. Our Office of Advancement will follow up with event details and guest coordination.',
  },

  // ── Home URL ──
  homeUrl: 'https://arizonachristian.edu',

  // ═══════════════════════════════════════════════════════════
  // LANDING PAGE CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  landing: {
    // ── Hero ──
    hero: {
      title: 'The Daniel Award',
      subtitle: 'for Courageous Public Faith',
      backgroundUrl: '', // optional background image
    },

    // ── Intro Text ──
    intro: 'Arizona Christian University warmly invites you to an unforgettable evening celebrating courage, conviction, and faithfulness to biblical truth, as we honor legendary social scientist and bestselling author George Barna with our 6th Daniel Award for Courageous Public Faith!',

    // ── About the Award ──
    about: {
      title: 'An Award of Prestige',
      text: 'The Daniel Award for Courageous Public Faith is given to an individual who has courageously stood for Jesus Christ and His truths within his or her sphere of influence. The name is derived from the Old Testament example of Daniel and his willingness to defy an unjust decree and continue in public prayer.',
      scripture: 'Daniel 6:10',
      passage: 'Now when Daniel learned that the decree had been published, he went home to his upstairs room where the windows opened toward Jerusalem. Three times a day he got down on his knees and prayed, giving thanks to his God, just as he had done before.',
    },

    // ── Featured Honoree ──
    featured: {
      enabled: true,
      name: 'George Barna',
      year: '2026',
      label: 'Upcoming Honoree',
      bio: 'For more than four decades, George Barna has stood at the forefront of understanding faith, culture, and the spiritual condition of America. An author, speaker, and pioneering public opinion researcher, he has demonstrated uncommon courage by telling the truth about what is actually happening in the Church and in society.',
      photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/George-Barna.png',
      eventDate: 'Thursday, April 9, 2026', // e.g. "Thursday, November 13, 2025"
      eventLocation: 'Arizona Biltmore, 2400 E Missouri Ave, Phoenix, AZ 85016', // e.g. "Arizona Biltmore, Phoenix, Arizona"
      ctaLabel: 'Register Now',
      ctaUrl: '/register',
    },

    // ── Past Recipients ──
    recipients: [
      { year: '2011', name: 'George W. Bush', description: 'Government', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/George-W-Bush-SQ.png' },
      { year: '2012', name: 'Franklin Graham', description: 'Vocational Ministry', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/Franklin-Graham-SQ.png' },
      { year: '2013', name: 'Michael W. Smith', description: 'Arts & Entertainment', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/Michael-W-Smith-SQ.png' },
      { year: '2015', name: 'David & Barbara Green', description: 'Business', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/DB-Green-SQ.png' },
      { year: '2016', name: 'James Dobson', description: 'Family', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/James-Dobson-SQ.png' },
      { year: '2026', name: 'George Barna', description: 'Education', photoUrl: 'https://storage.googleapis.com/web.arizonachristian.edu/Photos/George-Barna-SQ.png' },
    ],

    // ── Inaugurated Text ──
    inaugurated: 'The Daniel Award was inaugurated at Arizona Christian University\'s 50th anniversary celebration during the spring of 2011. The first recipient was the 43rd President of the United States, George W. Bush.',

    // ── CTA Section ──
    ctaSection: {
      title: 'An Award of Prestige',
      text: 'The Daniel Award honors those whose courageous faith has made a lasting impact on culture, leadership, and the public square.',
      buttons: [
        { label: 'Register Now', url: '/register', primary: true },
      ],
    },
  },
};
