// Five-card poker hand evaluation with one wild joker.
// Cards are { rank: 2..14, suit: 's'|'d'|'h'|'c' }; a joker is { rank: 0, suit: 'j' }.

const NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush', 'Five of a Kind',
];
const WORD = { 14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks', 10: 'Tens' };
const ONE = { 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten' };

function scoreNatural(cards) {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  // groups sorted by count, then rank
  const groups = Object.entries(counts)
    .map(([r, n]) => [n, +r])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq.join() === '14,5,4,3,2') straightHigh = 5;
  }
  let cat;
  if (groups[0][0] === 5) cat = 10;
  else if (straightHigh === 14 && flush) cat = 9;
  else if (straightHigh && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const tiebreak = straightHigh ? [straightHigh] : groups.map((g) => g[1]);
  return { cat, tiebreak, groups, flush, straightHigh };
}

function better(a, b) {
  if (a.cat !== b.cat) return a.cat > b.cat;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const x = a.tiebreak[i] || 0, y = b.tiebreak[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function evaluate(cards) {
  const naturals = cards.filter((c) => c.suit !== 'j');
  const hasJoker = naturals.length < cards.length;
  let best = null;
  if (!hasJoker) best = scoreNatural(naturals);
  else {
    for (const suit of ['s', 'd', 'h', 'c']) {
      for (let rank = 2; rank <= 14; rank++) {
        const s = scoreNatural([...naturals, { rank, suit }]);
        if (!best || better(s, best)) best = s;
      }
    }
  }
  const g = best.groups;
  let detail = '';
  switch (best.cat) {
    case 10: detail = `Five ${WORD[g[0][1]]}`; break;
    case 9: detail = 'Ace high, all one suit'; break;
    case 8: case 4: detail = `${ONE[best.straightHigh]} high`; break;
    case 7: case 3: case 1: detail = `${WORD[g[0][1]]}`; break;
    case 6: detail = `${WORD[g[0][1]]} full of ${WORD[g[1][1]]}`; break;
    case 2: detail = `${WORD[g[0][1]]} and ${WORD[g[1][1]]}`; break;
    default: detail = `${ONE[g[0][1]]} high`;
  }
  return { cat: best.cat, name: NAMES[best.cat], detail, wild: hasJoker };
}

// A line about what the hand says, in terms of what the cards actually are.
export function flavor(result, cards) {
  const n = (s) => cards.filter((c) => c.suit === s).length;
  const wild = result.wild ? ' The wild goose did some of the work.' : '';
  switch (result.cat) {
    case 10: return 'Not legal in most card rooms. Legal here.' + wild;
    case 9: return 'Everything I have built, in one hand. You found the secret.';
    case 8: return 'Five in a row, all one suit. You were paying attention.' + wild;
    case 7: return 'Four of the same rank across four different parts of my life.' + wild;
    case 6: return 'A full boat. Hard to beat, harder to fold.' + wild;
    case 5: return 'All one suit. You clearly have a type.' + wild;
    case 4: return 'A clean run from one end to the other.' + wild;
    case 3: return 'Three of a kind. A set is a set.' + wild;
    case 2: return 'Two pair. Good enough to get into trouble with.';
    case 1: return 'A pair. Playable, and I would probably still raise.' + wild;
    default:
      if (n('s') >= 3) return 'Nothing made, but you like the builds. Fair.';
      return 'Nothing made. Sometimes you just have to bluff.';
  }
}
