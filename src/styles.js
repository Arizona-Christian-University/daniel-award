export const CSS = `
/* ── Base Reset (standalone, no WP theme) ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
a{text-decoration:none;}

/* ═══════════════════════════════════════════
   DANIEL AWARD — PAGE STYLES
   Scoped under .da-page to avoid theme conflicts
   ═══════════════════════════════════════════ */

.da-page {
  --acu-red: #C8372D;
  --acu-red-dark: #9B2C24;
  --acu-red-light: #E85A50;
  --acu-black: #1A1A1A;
  --acu-charcoal: #2D2D2D;
  --acu-gray: #6B6B6B;
  --acu-light-gray: #F5F5F5;
  --acu-cream: #FAFAF8;
  --acu-gold: #D4A843;
  --acu-gold-light: #F0D89D;
  --acu-green: #2E7D32;
  --acu-green-light: #4CAF50;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--acu-black);
  line-height: 1.7;
  overflow-x: hidden;
}
.da-page *, .da-page *::before, .da-page *::after { box-sizing: border-box; }
.da-page img { max-width: 100%; display: block; }

/* ── Animations ── */
.da-anim { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
.da-anim.da-vis { opacity: 1; transform: translateY(0); }
.da-d2 { transition-delay: 0.15s; }
.da-d3 { transition-delay: 0.3s; }
.da-d4 { transition-delay: 0.45s; }
.da-d5 { transition-delay: 0.6s; }
.da-d6 { transition-delay: 0.75s; }
.da-d7 { transition-delay: 0.9s; }

/* ── Containers ── */
.da-container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.da-container-narrow { max-width: 850px; margin: 0 auto; padding: 0 1rem; }

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.da-hero { position: relative; min-height: 520px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 6rem 2rem 5rem; background: linear-gradient(155deg, var(--acu-black) 0%, var(--acu-charcoal) 35%, var(--acu-red-dark) 100%); overflow: hidden; }
.da-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgba(212,168,67,0.1) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(200,55,45,0.08) 0%, transparent 50%); z-index: 1; }
.da-hero::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 80px; background: linear-gradient(to top, #fff, transparent); z-index: 2; }
.da-hero-content { position: relative; z-index: 3; max-width: 800px; }
.da-hero-logo { max-width: 240px; height: auto; margin: 0 auto 2rem; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3)); }
.da-hero-eyebrow { font-size: 0.9rem; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 1rem; }
.da-hero h1 { font-size: clamp(2.75rem, 8vw, 4.5rem); font-weight: 900; color: #fff; letter-spacing: -1px; line-height: 1.1; margin-bottom: 0.75rem; }
.da-hero h1 span { display: block; font-size: clamp(1.1rem, 2.5vw, 1.4rem); font-weight: 500; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase; line-height: 1.4; margin-top: 0.4rem; }
.da-hero-honoree { font-size: clamp(1.3rem, 3vw, 1.7rem); font-weight: 700; color: var(--acu-gold-light); margin-bottom: 0.35rem; }
.da-hero-quote { font-size: clamp(1rem, 2vw, 1.15rem); font-style: italic; color: rgba(255,255,255,0.45); font-weight: 400; margin-bottom: 2rem; }
.da-hero-details { display: flex; align-items: center; justify-content: center; gap: 1.25rem; flex-wrap: wrap; }
.da-hero-detail { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.7); }
.da-hero-detail svg { width: 18px; height: 18px; fill: var(--acu-gold); opacity: 0.7; }
.da-hero-divider { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.25); }

/* ═══════════════════════════════════════════
   ABOUT / HONOREE
   ═══════════════════════════════════════════ */
.da-about { padding: 6rem 2rem; background: #fff; }
.da-about-container { max-width: 1100px; margin: 0 auto; }
.da-about-photo-wrap { position: relative; float: left; width: 350px; margin: 0 3rem 2rem 0; }
.da-about-photo { width: 100%; aspect-ratio: 4/5; border-radius: 16px; background-size: cover; background-position: center top; background-color: #ddd; }
.da-about-photo-accent { position: absolute; bottom: -12px; right: -12px; width: 60%; height: 60%; border-radius: 16px; border: 4px solid var(--acu-gold); opacity: 0.3; z-index: -1; }
.da-about-container h2 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; color: var(--acu-black); margin-bottom: 0.5rem; }
.da-about-container h2 span { color: var(--acu-red); }
.da-about-role { font-size: 1.1rem; color: var(--acu-gray); font-weight: 600; margin-bottom: 1.5rem; }
.da-about-bio p { font-size: 1.05rem; color: var(--acu-charcoal); margin-bottom: 1rem; line-height: 1.8; }
.da-about-container::after { content: ""; display: table; clear: both; }

/* ═══════════════════════════════════════════
   ABOUT THE AWARD
   ═══════════════════════════════════════════ */
.da-award-info { padding: 5rem 2rem; background: var(--acu-light-gray); }
.da-award-info-inner { max-width: 850px; margin: 0 auto; text-align: center; }
.da-award-info h2 { font-size: clamp(2rem, 5vw, 2.5rem); font-weight: 800; color: var(--acu-black); margin-bottom: 1.5rem; }
.da-award-info p { font-size: 1.1rem; color: var(--acu-charcoal); line-height: 1.8; margin-bottom: 2rem; }
.da-verse { background: #fff; border-radius: 16px; padding: 2.5rem 3rem; border-left: 5px solid var(--acu-gold); text-align: left; box-shadow: 0 4px 24px rgba(0,0,0,0.05); }
.da-verse p { font-size: 1.2rem; font-style: italic; color: var(--acu-charcoal); line-height: 1.8; margin-bottom: 0.75rem; }
.da-verse cite { font-size: 1rem; font-weight: 700; color: var(--acu-gold); font-style: normal; }

/* ═══════════════════════════════════════════
   SECTION HEADINGS
   ═══════════════════════════════════════════ */
.da-section-title { text-align: center; font-size: clamp(2rem, 5vw, 2.5rem); font-weight: 800; color: var(--acu-black); margin-bottom: 0.75rem; }
.da-section-intro { text-align: center; font-size: 1.15rem; color: var(--acu-gray); max-width: 650px; margin: 0 auto 3rem; line-height: 1.7; }

/* ═══════════════════════════════════════════
   SPONSORSHIP TIERS
   ═══════════════════════════════════════════ */
.da-tiers { padding: 6rem 2rem; background: #fff; }

.da-tier-card { background: #fff; border-radius: 16px; padding: 2rem 1.5rem 1.75rem; box-shadow: 0 4px 24px rgba(0,0,0,0.07); transition: all 0.35s ease; position: relative; overflow: hidden; cursor: pointer; border: 2px solid transparent; display: flex; flex-direction: column; }
.da-tier-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
.da-tier-card.da-selected { border-color: var(--acu-red); box-shadow: 0 8px 35px rgba(200,55,45,0.18); }
.da-tier-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }

/* Tier color variants */
.da-tier-event::before { background: linear-gradient(90deg, var(--acu-gold), #E8C96A); }
.da-tier-platinum::before { background: linear-gradient(90deg, #8B8B8B, #C0C0C0); }
.da-tier-gold::before { background: linear-gradient(90deg, var(--acu-gold), #C49B38); }
.da-tier-silver::before { background: linear-gradient(90deg, #A8A8A8, #D0D0D0); }
.da-tier-bronze::before { background: linear-gradient(90deg, #B87333, #CD8844); }

.da-tier-label { display: inline-block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.35rem; }
.da-tier-event .da-tier-label { color: var(--acu-gold); }
.da-tier-platinum .da-tier-label { color: #888; }
.da-tier-gold .da-tier-label { color: var(--acu-gold); }
.da-tier-silver .da-tier-label { color: #999; }
.da-tier-bronze .da-tier-label { color: #B87333; }

.da-tier-price { font-size: clamp(1.8rem, 3.5vw, 2.25rem); font-weight: 900; color: var(--acu-black); margin-bottom: 1rem; line-height: 1.1; }
.da-tier-divider { height: 1px; background: var(--acu-light-gray); margin-bottom: 1rem; }

.da-tier-features { list-style: none; margin: 0; padding: 0; margin-bottom: 1.5rem; flex: 1; }
.da-tier-features li { font-size: 0.92rem; color: var(--acu-charcoal); line-height: 1.5; padding: 0.3rem 0; padding-left: 1.35rem; position: relative; }
.da-tier-features li::before { content: ''; position: absolute; left: 0; top: 0.6rem; width: 7px; height: 7px; border-radius: 50%; }
.da-tier-event .da-tier-features li::before { background: var(--acu-gold); opacity: 0.5; }
.da-tier-platinum .da-tier-features li::before { background: #aaa; opacity: 0.5; }
.da-tier-gold .da-tier-features li::before { background: var(--acu-gold); opacity: 0.5; }
.da-tier-silver .da-tier-features li::before { background: #aaa; opacity: 0.5; }
.da-tier-bronze .da-tier-features li::before { background: #B87333; opacity: 0.5; }

.da-tier-highlight { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--acu-gold); margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: rgba(212,168,67,0.07); border-radius: 8px; }
.da-tier-highlight svg { width: 14px; height: 14px; fill: var(--acu-gold); flex-shrink: 0; }

.da-tier-select-btn { display: block; width: 100%; padding: 0.8rem 1.25rem; border-radius: 50px; font-family: inherit; font-size: 0.95rem; font-weight: 700; text-align: center; border: 2px solid var(--acu-red); background: transparent; color: var(--acu-red); cursor: pointer; transition: all 0.25s ease; margin-top: auto; }
.da-tier-select-btn:hover,
.da-tier-card.da-selected .da-tier-select-btn { background: var(--acu-red); color: #fff; }

/* Featured (full-width) card */
.da-tier-featured { grid-column: 1 / -1; max-width: 700px; margin: 0 auto 1rem; border: 2px solid rgba(212,168,67,0.25); background: linear-gradient(160deg, #FFFDF8, #fff 40%); }
.da-tier-featured.da-selected { border-color: var(--acu-gold); box-shadow: 0 8px 35px rgba(212,168,67,0.18); }
.da-tier-featured .da-tier-select-btn { border-color: var(--acu-gold); color: var(--acu-gold); background: transparent; }
.da-tier-featured .da-tier-select-btn:hover,
.da-tier-featured.da-selected .da-tier-select-btn { background: var(--acu-gold); color: #fff; }

.da-tiers-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; max-width: 1200px; margin: 0 auto 2rem; }

/* Individual seats row */
.da-individual-row { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 2rem 2.5rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 2px solid transparent; transition: all 0.35s ease; cursor: pointer; position: relative; overflow: hidden; }
.da-individual-row::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--acu-charcoal), var(--acu-gray)); }
.da-individual-row:hover { transform: translateY(-3px); box-shadow: 0 10px 35px rgba(0,0,0,0.1); }
.da-individual-row.da-selected { border-color: var(--acu-charcoal); box-shadow: 0 8px 35px rgba(45,45,45,0.15); }
.da-individual-info h3 { font-size: 1.4rem; font-weight: 800; color: var(--acu-black); margin-bottom: 0.25rem; }
.da-individual-info p { font-size: 1rem; color: var(--acu-gray); }
.da-individual-controls { display: flex; align-items: center; gap: 1rem; }
.da-qty-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #ddd; background: #fff; font-size: 1.25rem; font-weight: 700; color: var(--acu-charcoal); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.da-qty-btn:hover { border-color: var(--acu-red); color: var(--acu-red); }
.da-qty-display { font-size: 1.5rem; font-weight: 800; min-width: 2rem; text-align: center; }
.da-individual-select-btn { padding: 0.75rem 1.75rem; border-radius: 50px; border: 2px solid var(--acu-charcoal); background: transparent; font-family: inherit; font-size: 1rem; font-weight: 700; color: var(--acu-charcoal); cursor: pointer; transition: all 0.25s ease; }
.da-individual-select-btn:hover,
.da-individual-select-btn.da-active { background: var(--acu-charcoal); color: #fff; }

/* ═══════════════════════════════════════════
   REGISTRATION FORM
   ═══════════════════════════════════════════ */
.da-form-section { padding: 0 2rem 6rem; background: #fff; margin-top: -1rem; }
.da-form-wrap { background: var(--acu-charcoal); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.da-form-header { background: linear-gradient(135deg, var(--acu-black), var(--acu-charcoal)); padding: 2.5rem 3rem 2rem; text-align: center; }
.da-form-header h2 { font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
.da-form-header p { color: rgba(255,255,255,0.5); font-size: 1rem; }
.da-form-summary { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 1rem; }
.da-form-summary-tier { font-size: 1.05rem; font-weight: 700; color: var(--acu-gold-light); }
.da-form-summary-price { font-size: 1.05rem; font-weight: 800; color: #fff; }
.da-form-body { padding: 2.5rem 3rem 3rem; }

/* Empty state */
.da-form-empty { text-align: center; padding: 3rem 2rem; }
.da-form-empty svg { width: 48px; height: 48px; fill: rgba(255,255,255,0.15); margin-bottom: 1rem; }
.da-form-empty p { color: rgba(255,255,255,0.4); font-size: 1.05rem; }

/* Steps indicator */
.da-steps { display: flex; align-items: center; justify-content: center; margin-bottom: 2.5rem; gap: 0; }
.da-step { display: flex; align-items: center; gap: 0.5rem; }
.da-step-num { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.35); font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.da-step span:last-child { font-size: 0.9rem; color: rgba(255,255,255,0.35); font-weight: 600; transition: color 0.3s ease; }
.da-step-active .da-step-num { background: var(--acu-red); color: #fff; }
.da-step-active span:last-child { color: #fff; }
.da-step-done .da-step-num { background: rgba(200,55,45,0.3); color: var(--acu-red-light); }
.da-step-done span:last-child { color: rgba(255,255,255,0.5); }
.da-step-line { width: 40px; height: 2px; background: rgba(255,255,255,0.1); margin: 0 0.75rem; }

/* Step panels */
.da-step-panel { display: none; }
.da-step-panel.da-active { display: block; }

/* Form fields */
.da-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.da-field-full { grid-column: 1 / -1; }
.da-field label { display: block; font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 0.35rem; }
.da-required { color: var(--acu-red-light); }
.da-field input,
.da-field textarea { width: 100%; font-family: inherit; font-size: 1rem; padding: 0.75rem 1rem; border: 2px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(255,255,255,0.05); color: #fff; outline: none; transition: border-color 0.2s ease; }
.da-field input:focus,
.da-field textarea:focus { border-color: var(--acu-red); }
.da-field input::placeholder,
.da-field textarea::placeholder { color: rgba(255,255,255,0.25); }
.da-field textarea { min-height: 80px; resize: vertical; }

/* Form navigation */
.da-form-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); }
.da-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.75rem; border-radius: 50px; font-family: inherit; font-size: 1rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.25s ease; }
.da-btn svg { width: 18px; height: 18px; fill: currentColor; }
.da-btn-primary { background: var(--acu-red); color: #fff; }
.da-btn-primary:hover { background: var(--acu-red-dark); transform: translateY(-2px); }
.da-btn-secondary { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
.da-btn-secondary:hover { background: rgba(255,255,255,0.15); }

/* Guest name fields */
.da-guests-section { margin-bottom: 1rem; }
.da-guests-title { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
.da-guests-subtitle { font-size: 0.95rem; color: rgba(255,255,255,0.5); margin-bottom: 1.5rem; }
.da-table-group { margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); }
.da-table-group-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.7); margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
.da-table-group-title svg { width: 20px; height: 20px; fill: rgba(255,255,255,0.4); }

.da-guest-row { display: grid; grid-template-columns: 2rem 1fr 1fr auto; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; }
.da-guest-num { width: 28px; height: 28px; border-radius: 50%; background: rgba(200,55,45,0.1); color: var(--acu-red); font-size: 0.8rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.da-guest-row input { font-family: inherit; font-size: 1rem; padding: 0.65rem 0.85rem; border: 2px solid #e0e0e0; border-radius: 8px; background: #fff; color: var(--acu-black); outline: none; transition: border-color 0.2s ease; }
.da-guest-row input:focus { border-color: var(--acu-red); }
.da-guest-row input::placeholder { color: #bbb; }

/* VIP checkbox */
.da-vip-check { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; user-select: none; white-space: nowrap; }
.da-vip-check input[type="checkbox"] { display: none; }
.da-vip-check-box { width: 22px; height: 22px; border-radius: 6px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0; }
.da-vip-check-box svg { width: 14px; height: 14px; fill: #fff; opacity: 0; transition: opacity 0.15s ease; }
.da-vip-check input:checked + .da-vip-check-box { background: var(--acu-gold); border-color: var(--acu-gold); }
.da-vip-check input:checked + .da-vip-check-box svg { opacity: 1; }
.da-vip-check-label { font-size: 0.78rem; font-weight: 700; color: var(--acu-gray); letter-spacing: 0.3px; transition: color 0.2s ease; }
.da-vip-check input:checked ~ .da-vip-check-label { color: var(--acu-gold); }
.da-vip-check.da-vip-disabled { opacity: 0.35; cursor: not-allowed; }

.da-vip-counter { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; padding: 0.65rem 1rem; background: rgba(212,168,67,0.07); border-radius: 10px; border: 1px solid rgba(212,168,67,0.15); }
.da-vip-counter svg { width: 16px; height: 16px; fill: var(--acu-gold); flex-shrink: 0; }
.da-vip-counter p { font-size: 0.9rem; color: rgba(255,255,255,0.75); line-height: 1.4; margin: 0; }
.da-vip-counter strong { color: var(--acu-gold); font-weight: 800; }
.da-vip-counter .da-vip-count-num { font-weight: 800; color: var(--acu-gold); }

.da-vip-note { display: flex; gap: 0.75rem; align-items: flex-start; padding: 1rem 1.25rem; background: rgba(212,168,67,0.08); border-radius: 12px; margin-bottom: 1.5rem; }
.da-vip-note svg { width: 18px; height: 18px; fill: var(--acu-gold); flex-shrink: 0; margin-top: 2px; }
.da-vip-note p { font-size: 0.95rem; color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0; }
.da-vip-note strong { color: var(--acu-gold-light); }

/* Review step */
.da-review-block { background: var(--acu-light-gray); border-radius: 14px; padding: 1.75rem; margin-bottom: 1.25rem; }
.da-review-block h4 { font-size: 1rem; font-weight: 700; color: var(--acu-gray); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; }
.da-review-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; font-size: 1.05rem; }
.da-review-label { color: var(--acu-gray); }
.da-review-value { font-weight: 700; color: var(--acu-black); }
.da-review-total { font-size: 1.3rem; padding: 0.75rem 0; border-top: 2px solid rgba(0,0,0,0.1); margin-top: 0.5rem; }
.da-review-total .da-review-value { color: var(--acu-red); font-size: 1.4rem; }
.da-review-guests { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.da-review-guest { font-size: 1rem; padding: 0.35rem 0; color: var(--acu-charcoal); }
.da-review-guest span { color: var(--acu-gray); font-weight: 600; }

/* ═══════════════════════════════════════════
   STEP 4: PAYMENT
   ═══════════════════════════════════════════ */
.da-pay-summary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.5rem 1.75rem; margin-bottom: 2rem; }
.da-pay-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; }
.da-pay-summary-label { font-size: 0.95rem; color: rgba(255,255,255,0.5); }
.da-pay-summary-value { font-size: 0.95rem; font-weight: 700; color: #fff; }
.da-pay-summary-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 0.6rem 0; }
.da-pay-summary-total .da-pay-summary-label { font-size: 1.1rem; font-weight: 700; color: rgba(255,255,255,0.8); }
.da-pay-summary-total .da-pay-summary-value { font-size: 1.35rem; font-weight: 900; color: #fff; }

.da-pay-secure { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding: 0.75rem 1rem; background: rgba(46,125,50,0.08); border: 1px solid rgba(46,125,50,0.15); border-radius: 10px; }
.da-pay-secure svg { width: 16px; height: 16px; fill: var(--acu-green-light); flex-shrink: 0; }
.da-pay-secure p { font-size: 0.85rem; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.4; }
.da-pay-secure strong { color: rgba(255,255,255,0.75); font-weight: 700; }

.da-pay-label { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 0.75rem; display: block; }

.da-stripe-container { background: #fff; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; min-height: 80px; }
.da-stripe-container.da-stripe-loading { display: flex; align-items: center; justify-content: center; min-height: 120px; }
.da-stripe-container.da-stripe-loading::after { content: ''; width: 28px; height: 28px; border: 3px solid #eee; border-top-color: var(--acu-red); border-radius: 50%; animation: da-spin 0.7s linear infinite; }

.da-pay-btn { display: flex; align-items: center; justify-content: center; gap: 0.6rem; width: 100%; padding: 1rem 2rem; border-radius: 50px; border: none; font-family: inherit; font-size: 1.1rem; font-weight: 800; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; }
.da-pay-btn svg { width: 20px; height: 20px; fill: currentColor; }
.da-pay-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.da-pay-btn-ready { background: linear-gradient(135deg, var(--acu-green), #388E3C); color: #fff; }
.da-pay-btn-ready:hover { background: linear-gradient(135deg, #256929, var(--acu-green)); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(46,125,50,0.3); }
.da-pay-btn-processing { background: linear-gradient(135deg, #555, #666); color: rgba(255,255,255,0.8); cursor: wait; }
.da-pay-btn-processing .da-pay-btn-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: da-spin 0.7s linear infinite; }

.da-pay-error { background: rgba(200,55,45,0.1); border: 1px solid rgba(200,55,45,0.25); border-radius: 10px; padding: 0.85rem 1.15rem; margin-top: 1rem; display: none; }
.da-pay-error p { color: var(--acu-red-light); font-size: 0.9rem; margin: 0; line-height: 1.5; }

.da-pay-footer { display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-top: 1.25rem; }
.da-pay-footer svg { width: 14px; height: 14px; fill: rgba(255,255,255,0.25); }
.da-pay-footer span { font-size: 0.8rem; color: rgba(255,255,255,0.25); font-weight: 600; }

/* ═══════════════════════════════════════════
   CONFIRMATION
   ═══════════════════════════════════════════ */
.da-confirmation { display: none; text-align: center; padding: 3rem 2rem; }
.da-confirmation.da-active { display: block; }

.da-conf-check { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--acu-green), #43A047); margin: 0 auto 2rem; display: flex; align-items: center; justify-content: center; animation: da-conf-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; box-shadow: 0 8px 30px rgba(46,125,50,0.3); }
.da-conf-check svg { width: 40px; height: 40px; fill: #fff; animation: da-conf-draw 0.4s ease 0.3s forwards; opacity: 0; }
.da-conf-title { font-size: 1.75rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; animation: da-conf-fade 0.5s ease 0.2s forwards; opacity: 0; }
.da-conf-text { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.7; max-width: 520px; margin: 0 auto 2rem; animation: da-conf-fade 0.5s ease 0.35s forwards; opacity: 0; }
.da-conf-detail-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.5rem; max-width: 400px; margin: 0 auto 1.5rem; animation: da-conf-fade 0.5s ease 0.5s forwards; opacity: 0; }
.da-conf-detail-card .da-pay-summary-row { padding: 0.3rem 0; }
.da-conf-detail-card .da-pay-summary-label { color: rgba(255,255,255,0.4); font-size: 0.9rem; }
.da-conf-detail-card .da-pay-summary-value { color: #fff; font-size: 0.9rem; }
.da-conf-ref { font-size: 0.85rem; color: rgba(255,255,255,0.3); margin-bottom: 2rem; animation: da-conf-fade 0.5s ease 0.6s forwards; opacity: 0; }
.da-conf-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.8rem 2rem; border-radius: 50px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); font-family: inherit; font-size: 1rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.25s ease; animation: da-conf-fade 0.5s ease 0.7s forwards; opacity: 0; text-decoration: none; }
.da-conf-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

/* ── Keyframes ── */
@keyframes da-spin { to { transform: rotate(360deg); } }
@keyframes da-conf-pop { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes da-conf-draw { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
@keyframes da-conf-fade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }

/* ═══════════════════════════════════════════
   CTA FOOTER
   ═══════════════════════════════════════════ */
.da-cta { background: linear-gradient(135deg, var(--acu-charcoal) 0%, var(--acu-black) 100%); padding: 5rem 2rem; text-align: center; }
.da-cta h2 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; color: #fff; margin-bottom: 1rem; }
.da-cta p { font-size: clamp(1.15rem, 2.5vw, 1.35rem); color: rgba(255,255,255,0.7); line-height: 1.7; max-width: 700px; margin: 0 auto 2rem; }
.da-cta-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; margin-top: 2rem; }
.da-cta-contact a { display: inline-flex; align-items: center; gap: 0.5rem; color: rgba(255,255,255,0.8); font-size: 1.1rem; font-weight: 600; transition: color 0.2s ease; text-decoration: none; }
.da-cta-contact a:hover { color: var(--acu-gold-light); }
.da-cta-contact svg { width: 20px; height: 20px; fill: var(--acu-gold); }

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width: 1024px) {
  .da-tiers-grid { grid-template-columns: repeat(2, 1fr); }
  .da-tier-featured { grid-column: 1 / -1; max-width: 100%; }
}
@media (max-width: 768px) {
  .da-about-photo-wrap { float: none; width: 100%; max-width: 400px; margin: 0 auto 2rem; }
  .da-about-photo { aspect-ratio: 4/3; max-height: 350px; }
  .da-tiers-grid { grid-template-columns: 1fr; }
  .da-individual-row { flex-direction: column; text-align: center; }
  .da-field-row { grid-template-columns: 1fr; }
  .da-form-header, .da-form-body { padding-left: 1.5rem; padding-right: 1.5rem; }
  .da-verse { padding: 1.5rem; }
  .da-guest-row { grid-template-columns: 2rem 1fr auto; }
  .da-guest-row input:nth-of-type(2) { grid-column: 2; }
  .da-vip-check { grid-column: 2 / -1; justify-self: start; }
  .da-review-guests { grid-template-columns: 1fr; }
  .da-steps { transform: scale(0.85); }
  .da-step span:last-child { display: none; }
}
@media (max-width: 480px) {
  .da-form-nav { flex-direction: column; gap: 1rem; }
  .da-form-nav .da-btn { width: 100%; justify-content: center; }
  .da-step-line { width: 20px; }
}
`;
