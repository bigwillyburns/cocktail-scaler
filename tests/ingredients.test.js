// Run with: node --test tests/ingredients.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { COMMON_INGREDIENTS, suggestIngredients } = require('../web/ingredients.js');

const names = (results) => results.map((r) => r.name);

test('names starting with the query come first', () => {
  const results = names(suggestIngredients('gin'));
  assert.deepEqual(results, ['Gin', 'Ginger ale', 'Ginger beer', 'Ginger syrup', 'London dry gin', 'Old Tom gin']);
});

test('an exact match comes first so its ABV can be filled in', () => {
  const [first] = suggestIngredients('GIN');
  assert.equal(first.name, 'Gin');
  assert.equal(first.abv, 40);
});

test('matches the start of later words', () => {
  assert.deepEqual(names(suggestIngredients('bitt')).slice(0, 2).sort(), ['Angostura bitters', 'Celery bitters']);
});

test('ignores case and accents', () => {
  assert.ok(names(suggestIngredients('benedictine')).includes('Bénédictine'));
  assert.ok(names(suggestIngredients('CAMP')).includes('Campari'));
});

test("the user's own ingredients come first and keep their ABV", () => {
  const results = suggestIngredients('bour', [{ name: "Buffalo Trace bourbon", abv: 45 }, { name: 'Bourbon', abv: 50 }]);
  assert.equal(results[0].name, 'Bourbon');
  assert.equal(results[0].abv, 50);
  assert.equal(results[0].mine, true);
  assert.equal(results.filter((r) => r.name.toLowerCase() === 'bourbon').length, 1);
});

test('limits the number of suggestions', () => {
  assert.ok(suggestIngredients('e').length <= 6);
  assert.equal(suggestIngredients('e', [], 3).length, 3);
});

test('nothing for an empty query or no match', () => {
  assert.deepEqual(suggestIngredients('  '), []);
  assert.deepEqual(suggestIngredients('zzzz'), []);
});

test('match position points at the typed text', () => {
  const [first] = suggestIngredients('juice');
  assert.equal(first.name.slice(first.matchStart, first.matchStart + first.matchLength).toLowerCase(), 'juice');
});

test('built-in list has sane ABVs and no duplicates', () => {
  const seen = new Set();
  for (const [name, abv] of COMMON_INGREDIENTS) {
    assert.ok(abv >= 0 && abv <= 100, name);
    assert.ok(!seen.has(name.toLowerCase()), `duplicate ${name}`);
    seen.add(name.toLowerCase());
  }
});
