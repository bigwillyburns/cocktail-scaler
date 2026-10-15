'use strict';

// Common retail sizes, and which bottles to buy to cover a scaled-up volume.

const BUY_CATEGORIES = {
  spirit: 'Liquor', // key kept as "spirit" so saved recipes still match
  liqueur: 'Liqueur',
  wine: 'Wine / vermouth',
  sparkling: 'Sparkling wine',
  bitters: 'Bitters',
  mixer: 'Mixer / soda',
  none: 'Fresh / homemade',
};

const REGIONS = { US: 'US', EU: 'UK / EU' };

/** Common container sizes in ml, per region and category. */
const BOTTLE_SIZES = {
  US: {
    spirit: [750, 1750],
    liqueur: [375, 750, 1000],
    wine: [375, 750, 1000],
    sparkling: [187, 375, 750, 1500],
    bitters: [118, 296, 473],
    mixer: [355, 1000, 2000],
  },
  EU: {
    spirit: [350, 700, 1000, 1500],
    liqueur: [350, 500, 700, 1000],
    wine: [375, 750, 1000],
    sparkling: [200, 375, 750, 1500],
    bitters: [100, 200],
    mixer: [150, 330, 1000],
  },
};

const SIZE_LABELS = { 118: '4 oz', 296: '10 oz', 473: '16 oz', 355: '12 oz can', 330: '330 ml can', 187: '187 ml' };

function sizeLabel(ml) {
  if (SIZE_LABELS[ml]) return SIZE_LABELS[ml];
  return ml >= 1000 ? `${+(ml / 1000).toFixed(2)} L` : `${ml} ml`;
}

/** Best guess at how an ingredient is sold, from its name, unit and ABV. */
function guessCategory({ name = '', unit, abv = 0 }) {
  const n = name.toLowerCase();
  if (unit === 'dash' || /\bbitters\b/.test(n)) return 'bitters';
  if (/champagne|prosecco|cava\b|cr[eé]mant|sparkling|spumante|\bfizz\b/.test(n)) return 'sparkling';
  if (abv < 15 && /soda|tonic|cola|coke|ginger (ale|beer)|lemonade|seltzer|sprite|club|mineral water/.test(n)) return 'mixer';
  if (abv > 0 && /vermouth|sherry|\bport\b|wine|lillet|cocchi|madeira|marsala|dubonnet|byrrh|quinquina|americano/.test(n)) return 'wine';
  if (abv >= 30) return 'spirit';
  if (abv >= 15) return 'liqueur';
  if (abv > 0) return 'wine';
  return 'none';
}

// Each extra bottle "costs" this much volume, so fewer, larger bottles win
// unless a mix wastes noticeably less.
const BOTTLE_PENALTY_ML = 150;
// Never suggest more than this many of any size other than the largest.
const MAX_SMALLER_BOTTLES = 3;
// Ignore shortfalls smaller than this (rounding noise).
const TOLERANCE_ML = 0.5;

/**
 * Cheapest mix of bottles that covers `neededML`.
 * Returns { bottles: [{ size, count }], count, totalML, spareML } or null.
 */
function recommendBottles(neededML, sizes) {
  if (!(neededML > 0) || !sizes || !sizes.length) return null;
  const desc = [...sizes].sort((a, b) => b - a);
  const target = Math.max(neededML - TOLERANCE_ML, neededML / 2);
  const maxLargest = Math.ceil(target / desc[0]);
  const counts = new Array(desc.length).fill(0);
  let best = null;

  const visit = (i, volume, bottles) => {
    if (volume >= target) {
      const cost = volume + bottles * BOTTLE_PENALTY_ML;
      if (!best || cost < best.cost || (cost === best.cost && bottles < best.bottles)) {
        best = { cost, volume, bottles, counts: [...counts] };
      }
      return;
    }
    if (i === desc.length) return;
    const lo = i === 0 ? Math.max(0, maxLargest - MAX_SMALLER_BOTTLES) : 0;
    const hi = i === 0 ? maxLargest : MAX_SMALLER_BOTTLES;
    for (let c = lo; c <= hi; c++) {
      counts[i] = c;
      visit(i + 1, volume + c * desc[i], bottles + c);
    }
    counts[i] = 0;
  };
  visit(0, 0, 0);

  return {
    bottles: desc.map((size, i) => ({ size, count: best.counts[i] })).filter((b) => b.count > 0),
    count: best.bottles,
    totalML: best.volume,
    spareML: Math.max(best.volume - neededML, 0),
  };
}

if (typeof module === 'object' && module.exports) {
  module.exports = { BUY_CATEGORIES, REGIONS, BOTTLE_SIZES, sizeLabel, guessCategory, recommendBottles };
}
