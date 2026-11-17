// The deck. Every card on the site comes from this list.
// To edit copy, change it here. To add a card, add an entry (and a scene in js/scenes if you want one).
// rank: 14 = Ace, 13 = King, 12 = Queen, 11 = Jack, 0 = Joker (wild).
// suit: s = Builds, d = Work, h = Loves, c = Me, j = Joker.

export const SUITS = {
  s: { glyph: '♠', name: 'BUILDS', red: false },
  d: { glyph: '♦', name: 'WORK', red: true },
  h: { glyph: '♥', name: 'LOVES', red: true },
  c: { glyph: '♣', name: 'ME', red: false },
  j: { glyph: '★', name: 'WILD', red: true },
};

export const RANK_LABEL = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 0: '★' };

export const CARDS = [
  {
    id: 'unipoker', rank: 14, suit: 's', scene: 'unipoker',
    title: 'UniPoker', kicker: 'THE POKER PLATFORM FOR COLLEGE CLUBS',
    emblem: '♠', pal: { bg: '#0B2A1D', fg: '#FBF8F1', ac: '#E9C46A' },
    lede: 'I am building UniPoker to take over the world of collegiate poker: one place for clubs to run private games, tournaments and a cross-school league.',
    facts: [
      ['ENGINE', 'Real No-Limit Hold\'em rules, written and tested from scratch: side pots, split pots, incomplete all-ins.'],
      ['FAIR PLAY', 'Camera-free anticheat. Every decision is compared against a solver, and each hand gets a Play Score.'],
      ['TOURNAMENTS', 'Blind schedules, late registration, multi-table balancing and table breaking.'],
      ['LEAGUE', 'The intercollegiate season runs inside the app: 42 teams in 7 groups, through playoffs and finals.'],
    ],
    links: [['Visit unipoker.net', 'https://unipoker.net']],
    note: 'The hand on screen is an illustration of the replayer, not a real game.',
  },
  {
    id: 'vector', rank: 13, suit: 's', scene: 'vector',
    title: 'VECTOR', kicker: 'PING PONG TRACKER',
    emblem: '◎', pal: { bg: '#050506', fg: '#E8E8E6', ac: '#FF6A00' },
    lede: 'My friends kept changing the score. So I pointed a camera at the table and took the scoreboard out of their hands.',
    facts: [
      ['IDEA', 'Computer vision follows the ball, detects bounces, works out who lost the rally and runs the serve rotation.'],
      ['RULE', 'Nobody types the score. Try clicking it.'],
      ['STATUS', 'The interface is done. The ball tracking is still a work in progress, and I am fine admitting that.'],
    ],
    links: [],
    note: 'The rally on screen is simulated.',
  },
  {
    id: 'bearings', rank: 12, suit: 's', scene: 'bearings',
    title: 'Golden Bearings', kicker: 'GEOGUESSR, BUT ONLY BERKELEY',
    emblem: '⌖', pal: { bg: '#06122A', fg: '#FFF5E1', ac: '#FDB515' },
    lede: 'You get dropped somewhere on or around campus. Look around, drop a pin, and find out how well you actually know Berkeley.',
    facts: [
      ['SPOTS', '54 hand-picked landmarks plus 127 random streets across campus, Southside, Northside and Downtown.'],
      ['MODES', 'Campus Classic, Wander Mode, a 45-second Bear Sprint and a Daily Stroll that is the same for everyone.'],
      ['EXTRAS', 'A sticker book of landmarks, hints that cost points, and sound effects synthesized in the browser.'],
    ],
    links: [['Open full screen', 'golden-bearings/']],
    play: 'golden-bearings/',
  },
  {
    id: 'site', rank: 11, suit: 's', scene: 'deck',
    title: 'This Deck', kicker: 'THE SITE YOU ARE ON',
    emblem: '▚', pal: { bg: '#0A0A0D', fg: '#F2F1ED', ac: '#C9CEDA' },
    lede: 'A portfolio that is a hand of cards. Every card opens into its own world, and five of them make a poker hand.',
    facts: [
      ['BUILT WITH', 'Plain HTML, CSS and JavaScript, with three.js for the 3D. No framework and no build step.'],
      ['SECRET', 'There is a royal flush in this deck. The joker is wild.'],
    ],
    links: [],
  },
  {
    id: 'qualcomm', rank: 13, suit: 'd', scene: 'qualcomm',
    title: 'Qualcomm', kicker: 'AI ENGINEER / AUG–DEC 2026',
    emblem: '▣', pal: { bg: '#060A1C', fg: '#EAF0FF', ac: '#3D7BFF' },
    lede: 'Working on Agentic AI and the Memory Layer.',
    facts: [
      ['ROLE', 'AI Engineer'],
      ['WHEN', 'August 2026 to December 2026'],
      ['FOCUS', 'Agentic memory across multiple devices'],
    ],
    links: [],
  },
  {
    id: 'productspace', rank: 12, suit: 'd', scene: 'space',
    title: 'Product Space', kicker: 'MEMBER / UC BERKELEY',
    emblem: '◆', pal: { bg: '#0D0716', fg: '#F3ECFF', ac: '#B48CFF' },
    lede: 'Member of Product Space @ Berkeley, spending time with people passionate about product.',
    facts: [],
    links: [],
  },
  {
    id: 'berkeley', rank: 11, suit: 'd', scene: 'campanile',
    title: 'UC Berkeley', kicker: 'CS / ECON',
    emblem: '▲', pal: { bg: '#001B36', fg: '#FFF7E0', ac: '#FDB515' },
    lede: 'Studying Computer Science and Economics at Cal.',
    facts: [
      ['STUDY', 'Computer Science and Economics'],
      ['WHERE', 'Berkeley, California'],
    ],
    links: [],
  },
  {
    id: 'poker', rank: 14, suit: 'h', scene: 'chips',
    title: 'Poker', kicker: 'FANATIC',
    emblem: '♥', pal: { bg: '#14060A', fg: '#FBEDEA', ac: '#FF2E3A' },
    lede: 'Poker fanatic. It is the reason this whole site is a deck of cards, and the reason I am building UniPoker.',
    facts: [
      ['GAME', 'No-Limit Hold\'em'],
      ['TRY IT', 'Click anywhere to throw chips in.'],
    ],
    links: [],
  },
  {
    id: 'boston', rank: 13, suit: 'h', scene: 'sports',
    title: 'Boston Sports', kicker: 'PATRIOTS / CELTICS',
    emblem: '◒', pal: { bg: '#081428', fg: '#F2F4F8', ac: '#C8102E' },
    lede: 'Always been a huge sports fan, and proud to say I\'m from the greatest city in sports history.',
    facts: [
      ['FOOTBALL', 'New England Patriots'],
      ['BASKETBALL', 'Boston Celtics'],
      ['SUNDAYS', 'Fantasy football'],
    ],
    links: [],
  },
  {
    id: 'about', rank: 14, suit: 'c', scene: 'gem', gem: 'club',
    title: 'Aadit Rana', kicker: 'ABOUT',
    emblem: '♣', pal: { bg: '#0B0C10', fg: '#F2F1ED', ac: '#C9CEDA' },
    lede: 'I\'m currently a student at UC Berkeley, working at Qualcomm and on UniPoker on the side.',
    facts: [
      ['INTO', 'Poker, Boston sports, fantasy football, poetry.'],
      ['POEM', 'Wild Geese by Mary Oliver. Find the joker.'],
    ],
    links: [],
  },
  {
    id: 'contact', rank: 13, suit: 'c', scene: 'gem', gem: 'knot',
    title: 'Find Me', kicker: 'LINKS',
    emblem: '→', pal: { bg: '#0D0A0B', fg: '#F2F1ED', ac: '#FF6B73' },
    lede: 'Say hello.',
    facts: [],
    // Add LinkedIn or a resume here when you want them on the site.
    links: [['aaditrana@berkeley.edu', 'mailto:aaditrana@berkeley.edu'], ['GitHub', 'https://github.com/monkey00'], ['unipoker.net', 'https://unipoker.net']],
  },
  {
    id: 'wildgeese', rank: 0, suit: 'j', scene: 'geese',
    title: 'Wild Geese', kicker: 'MARY OLIVER',
    emblem: '﹀', pal: { bg: '#0A1730', fg: '#F4EFE3', ac: '#FFB37A' },
    lede: '',
    facts: [],
    links: [],
    bare: true,
  },
];

export const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));
