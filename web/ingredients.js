'use strict';

// Type-ahead suggestions for ingredient names: common cocktail ingredients with
// a typical ABV, plus whatever the user has used in their own recipes.

/** [name, typical ABV %]. Brands vary; these are sensible starting points. */
const COMMON_INGREDIENTS = [
  // Liquor
  ['Gin', 40], ['London dry gin', 47], ['Old Tom gin', 40], ['Vodka', 40],
  ['White rum', 40], ['Dark rum', 40], ['Aged rum', 40], ['Spiced rum', 35], ['Overproof rum', 63],
  ['Bourbon', 45], ['Rye whiskey', 45], ['Scotch whisky', 40], ['Islay Scotch', 43],
  ['Irish whiskey', 40], ['Japanese whisky', 43], ['Tequila blanco', 40], ['Tequila reposado', 40],
  ['Mezcal', 45], ['Cognac', 40], ['Brandy', 40], ['Apple brandy', 40], ['Calvados', 40],
  ['Pisco', 40], ['Cachaça', 40], ['Absinthe', 60],
  // Liqueurs & amari
  ['Campari', 24], ['Aperol', 11], ['Cointreau', 40], ['Triple sec', 30], ['Grand Marnier', 40],
  ['Dry curaçao', 40], ['Blue curaçao', 24], ['Maraschino liqueur', 32], ['Green Chartreuse', 55],
  ['Yellow Chartreuse', 40], ['Bénédictine', 40], ['Drambuie', 40], ['Amaretto', 28],
  ['Coffee liqueur', 20], ['Kahlúa', 20], ['Crème de cassis', 20], ['Crème de cacao', 25],
  ['Crème de menthe', 25], ['Crème de violette', 20], ['Crème de mûre', 16],
  ['Elderflower liqueur', 20], ['St-Germain', 20], ['Velvet falernum', 11], ['Allspice dram', 22.5],
  ['Apricot liqueur', 24], ['Peach schnapps', 20], ['Limoncello', 30], ['Galliano', 42.3],
  ['Frangelico', 20], ['Midori', 20], ['Chambord', 16.5], ['Sloe gin', 26], ["Pimm's No. 1", 25],
  ['Irish cream', 17], ['Fernet-Branca', 39], ['Amaro Montenegro', 23], ['Amaro Nonino', 35],
  ['Averna', 29], ['Cynar', 16.5], ['Suze', 15],
  // Wine & fortified wine
  ['Sweet vermouth', 16], ['Dry vermouth', 18], ['Blanc vermouth', 16], ['Lillet Blanc', 17],
  ['Cocchi Americano', 16.5], ['Fino sherry', 15], ['Amontillado sherry', 17], ['Pedro Ximénez sherry', 17],
  ['Ruby port', 20], ['Tawny port', 20], ['Champagne', 12], ['Prosecco', 11], ['Cava', 11.5],
  ['Red wine', 13], ['White wine', 12], ['Lager', 5], ['Stout', 5],
  // Bitters
  ['Angostura bitters', 44.7], ["Peychaud's bitters", 35], ['Orange bitters', 28],
  ['Chocolate bitters', 45], ['Celery bitters', 35],
  // Juices
  ['Lime juice', 0], ['Lemon juice', 0], ['Orange juice', 0], ['Grapefruit juice', 0],
  ['Pineapple juice', 0], ['Cranberry juice', 0], ['Tomato juice', 0], ['Apple juice', 0],
  // Syrups
  ['Simple syrup', 0], ['Rich simple syrup', 0], ['Demerara syrup', 0], ['Honey syrup', 0],
  ['Agave syrup', 0], ['Maple syrup', 0], ['Grenadine', 0], ['Orgeat', 0], ['Cinnamon syrup', 0],
  ['Ginger syrup', 0], ['Raspberry syrup', 0], ['Passion fruit syrup', 0],
  // Mixers & other
  ['Tonic water', 0], ['Soda water', 0], ['Ginger beer', 0], ['Ginger ale', 0], ['Cola', 0],
  ['Lemon-lime soda', 0], ['Grapefruit soda', 0], ['Coconut water', 0], ['Water', 0],
  ['Espresso', 0], ['Cold brew coffee', 0], ['Heavy cream', 0], ['Coconut cream', 0], ['Egg white', 0],
];

const fold = (s) => s.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Up to `limit` suggestions for `query`, best first: an exact match, names
 * starting with it, names with a word starting with it, then names containing it.
 * `history` ([{ name, abv }]) is the user's own ingredients and wins ties and
 * duplicates, so their ABV is used over the built-in one.
 * Returns [{ name, abv, matchStart, matchLength, mine }].
 */
function suggestIngredients(query, history = [], limit = 6) {
  const q = fold(query.trim());
  if (!q) return [];
  const seen = new Set();
  const candidates = [];
  const add = (name, abv, mine) => {
    const key = fold(name);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ name, abv, mine, key });
  };
  history.forEach((h) => add(h.name, h.abv, true));
  COMMON_INGREDIENTS.forEach(([name, abv]) => add(name, abv, false));

  return candidates
    .map((c) => {
      const index = c.key.indexOf(q);
      if (index < 0) return null;
      // An exact match still shows (first), so picking it fills in the ABV.
      const rank = c.key === q ? -1 : index === 0 ? 0 : /[\s\-'(]/.test(c.key[index - 1]) ? 1 : 2;
      return { name: c.name, abv: c.abv, mine: c.mine, rank, matchStart: index, matchLength: q.length };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || b.mine - a.mine || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ rank, ...rest }) => rest);
}

if (typeof module === 'object' && module.exports) {
  module.exports = { COMMON_INGREDIENTS, suggestIngredients };
}
