// Run with: node --test tests/bottles.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { BUY_CATEGORIES, BOTTLE_SIZES, guessCategory, recommendBottles, sizeLabel } = require('../web/bottles.js');

const US = BOTTLE_SIZES.US;
const describe = (rec) => rec.bottles.map((b) => `${b.count}x${b.size}`).join('+');

test('US liquor only comes in 750 ml and 1.75 L', () => {
  assert.deepEqual(US.spirit, [750, 1750]);
  assert.equal(BUY_CATEGORIES.spirit, 'Liquor');
});

test('exact single bottle', () => {
  assert.equal(describe(recommendBottles(750, US.spirit)), '1x750');
  assert.equal(describe(recommendBottles(1750, US.spirit)), '1x1750');
  assert.equal(describe(recommendBottles(1000, US.liqueur)), '1x1000');
});

test('small amounts get the smallest sensible bottle', () => {
  assert.equal(describe(recommendBottles(60, US.spirit)), '1x750');
  assert.equal(describe(recommendBottles(60, US.liqueur)), '1x375');
  assert.equal(describe(recommendBottles(22, US.bitters)), '1x118');
});

test('prefers two exact bottles over one big one with waste', () => {
  assert.equal(describe(recommendBottles(1500, US.spirit)), '2x750');
});

test('mixes handles and 750s to limit waste', () => {
  assert.equal(describe(recommendBottles(2000, US.spirit)), '3x750');
  assert.equal(describe(recommendBottles(4000, US.spirit)), '1x1750+3x750');
});

test('rounding noise does not add a bottle', () => {
  assert.equal(describe(recommendBottles(750.3, US.spirit)), '1x750');
});

test('always covers the need, even for big batches', () => {
  for (const need of [1, 333, 1299, 4321, 20000, 98765]) {
    for (const sizes of Object.values(US)) {
      const rec = recommendBottles(need, sizes);
      assert.ok(rec.totalML >= need - 0.5, `${need} with ${sizes}`);
      assert.equal(rec.count, rec.bottles.reduce((s, b) => s + b.count, 0));
    }
  }
});

test('large batches mostly use the largest size', () => {
  const rec = recommendBottles(20000, US.spirit);
  assert.equal(rec.bottles[0].size, 1750);
  assert.ok(rec.spareML < 1750);
});

test('no recommendation for zero', () => {
  assert.equal(recommendBottles(0, US.spirit), null);
});

test('guesses categories', () => {
  assert.equal(guessCategory({ name: 'Bourbon', unit: 'oz', abv: 50 }), 'spirit');
  assert.equal(guessCategory({ name: 'Campari', unit: 'oz', abv: 24 }), 'liqueur');
  assert.equal(guessCategory({ name: 'Sweet vermouth', unit: 'oz', abv: 16 }), 'wine');
  assert.equal(guessCategory({ name: 'Angostura', unit: 'dash', abv: 44.7 }), 'bitters');
  assert.equal(guessCategory({ name: 'Orange bitters', unit: 'ml', abv: 28 }), 'bitters');
  assert.equal(guessCategory({ name: 'Prosecco', unit: 'oz', abv: 11 }), 'sparkling');
  assert.equal(guessCategory({ name: 'Tonic water', unit: 'oz', abv: 0 }), 'mixer');
  assert.equal(guessCategory({ name: 'Lime juice', unit: 'oz', abv: 0 }), 'none');
  assert.equal(guessCategory({ name: 'Simple syrup', unit: 'oz', abv: 0 }), 'none');
});

test('size labels', () => {
  assert.equal(sizeLabel(750), '750 ml');
  assert.equal(sizeLabel(1750), '1.75 L');
  assert.equal(sizeLabel(118), '4 oz');
});
