'use strict';

// ---------- Units & maths ----------

const ML_PER_UNIT = { ml: 1, oz: 29.5735, dash: 0.92 }; // US fl oz; a dash is ~1/32 oz
const INGREDIENT_UNITS = ['ml', 'oz', 'dash'];
const BATCH_UNITS = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41 };
const BATCH_DIGITS = { ml: 1, L: 3, oz: 2, gal: 3 };
const STORAGE_KEY = 'cocktail-scaler/recipes/v1';

const volumeML = (i) => (i.amount || 0) * ML_PER_UNIT[i.unit];
const alcoholML = (i) => volumeML(i) * (i.abv || 0) / 100;
const totalVolumeML = (items) => items.reduce((sum, i) => sum + volumeML(i), 0);

/** Final ABV (0–100). `dilutionPercent` adds water as a % of the undiluted volume. */
function abv(items, dilutionPercent = 0) {
  const volume = totalVolumeML(items);
  if (volume <= 0) return 0;
  const alcohol = items.reduce((sum, i) => sum + alcoholML(i), 0);
  return alcohol / (volume * (1 + Math.max(dilutionPercent, 0) / 100)) * 100;
}

// ---------- Formatting ----------

const formatters = {};
function num(value, digits = 2) {
  formatters[digits] ||= new Intl.NumberFormat(undefined, { maximumFractionDigits: digits });
  return formatters[digits].format(value);
}
const pct = (v) => num(v, 1) + '%';
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** Parses user input, accepting "." or "," as the decimal separator. */
function parse(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const unitLabel = (unit, amount) => (unit === 'dash' && amount !== 1 ? 'dashes' : unit);
const showAmount = (amount, unit) => `${num(amount)} ${unitLabel(unit, amount)}`;
const showBatch = (ml, unit) => `${num(ml / BATCH_UNITS[unit], BATCH_DIGITS[unit])} ${unit}`;
const volText = (ml) => `${showBatch(ml, 'ml')} · ${showBatch(ml, 'oz')}`;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

// ---------- Storage ----------

const newId = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

function normalizeRecipe(r) {
  if (!r || typeof r.name !== 'string' || !Array.isArray(r.ingredients)) return null;
  const ingredients = r.ingredients
    .filter((i) => i && typeof i.name === 'string')
    .map((i) => ({
      name: i.name,
      amount: Math.max(Number(i.amount) || 0, 0),
      unit: ML_PER_UNIT[i.unit] ? i.unit : 'ml',
      abv: clamp(Number(i.abv) || 0, 0, 100),
      ...(BUY_CATEGORIES[i.buyAs] ? { buyAs: i.buyAs } : {}),
    }));
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name: r.name,
    notes: typeof r.notes === 'string' ? r.notes : '',
    dilution: clamp(Number(r.dilution) || 0, 0, 100),
    ingredients,
    createdAt: Number(r.createdAt) || Date.now(),
    updatedAt: Number(r.updatedAt) || Date.now(),
  };
}

function loadRecipes() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data.map(normalizeRecipe).filter(Boolean) : [];
  } catch {
    return [];
  }
}

let recipes = loadRecipes();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    alert("Couldn't save. Storage may be full or turned off (e.g. Private Browsing).");
  }
}

const SETTINGS_KEY = 'cocktail-scaler/settings/v1';
const EU_LOCALE = /^(en-(GB|IE|AU|NZ)|de|fr|es|it|nl|pt|sv|da|fi|nb|no|pl|cs|el|hu|ro|sk|sl|hr|bg|lt|lv|et)\b/i;

const settings = (() => {
  const defaults = { region: EU_LOCALE.test(navigator.language || '') ? 'EU' : 'US' };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return { ...defaults, ...(REGIONS[saved.region] ? { region: saved.region } : {}) };
  } catch {
    return defaults;
  }
})();

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* not critical */ }
}

const findRecipe = (id) => recipes.find((r) => r.id === id);
const sortedRecipes = () =>
  [...recipes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

const EXAMPLE = {
  name: 'Negroni',
  notes: 'Stir with ice, strain over a large cube. Orange peel.',
  dilution: 20,
  ingredients: [
    { name: 'Gin', amount: 1, unit: 'oz', abv: 40 },
    { name: 'Campari', amount: 1, unit: 'oz', abv: 24 },
    { name: 'Sweet vermouth', amount: 1, unit: 'oz', abv: 16 },
  ],
};

// ---------- UI helpers ----------

const ICON = {
  back: '<svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg class="chev" width="8" height="14" viewBox="0 0 8 14" aria-hidden="true"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m2 2 10 10M12 2 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  share: '<svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M9 13V2M5 6l4-4 4 4M3 9v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  scale: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 2h6v6M18 2l-7 7M8 18H2v-6M2 18l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  glass: '<svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 12h44L32 36zM32 36v16M22 54h20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="18" r="4" fill="currentColor"/></svg>',
};

const app = document.getElementById('app');

function header({ title = '', left = '', right = '' }) {
  return `<header class="bar">
    <div class="bar-side">${left}</div>
    <h1 class="bar-title">${esc(title)}</h1>
    <div class="bar-side right">${right}</div>
  </header>`;
}

const backLink = (href, label) =>
  `<a class="bar-btn" href="${href}">${ICON.back}<span class="label">${esc(label)}</span></a>`;

const kv = (label, value, cls = '') =>
  `<li class="row ${cls}"><span>${esc(label)}</span><span class="row-value">${esc(value)}</span></li>`;

const seg = (value, label, current) =>
  `<button type="button" data-value="${esc(value)}" aria-pressed="${value === current}">${esc(label)}</button>`;

let toastTimer;
function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/** Resets per-view event handlers so listeners never pile up between screens. */
function mount(html, title) {
  app.onclick = app.oninput = app.onchange = app.onsubmit = null;
  app.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
}

// ---------- Cocktail list ----------

function listView() {
  const all = sortedRecipes();
  mount(`
    ${header({ right: `<a class="bar-btn icon" href="#/new" aria-label="New cocktail">${ICON.plus}</a>` })}
    <main class="content">
      <h1 class="large-title">Cocktail List</h1>
      ${all.length
        ? `<input class="search" id="search" type="search" placeholder="Search cocktails" autocomplete="off" aria-label="Search cocktails">
           <ul class="group" id="recipe-list"></ul>`
        : `<div class="empty">
             ${ICON.glass}
             <h2>No cocktails yet</h2>
             <p>Create a recipe to calculate its ABV and scale it up.</p>
             <a class="button primary" href="#/new">${ICON.plus} New cocktail</a>
             <button class="button tinted" data-action="example">Add an example Negroni</button>
           </div>`}
      <section class="backup">
        <p>Recipes are saved on this device. Back them up now and then.</p>
        <div class="actions">
          ${all.length ? '<button class="button plain inline" data-action="export">Export backup</button>' : ''}
          <button class="button plain inline" data-action="import">Import backup</button>
        </div>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </section>
    </main>`, 'Cocktails');

  const listEl = document.getElementById('recipe-list');
  const renderList = (query = '') => {
    const q = query.trim().toLocaleLowerCase();
    const shown = q ? all.filter((r) => r.name.toLocaleLowerCase().includes(q)) : all;
    listEl.innerHTML = shown.length
      ? shown.map((r) => `<li><a class="row link" href="#/r/${esc(r.id)}">
          <div class="row-main">
            <div class="row-title">${esc(r.name)}</div>
            <div class="row-sub">${r.ingredients.length} ingredient${r.ingredients.length === 1 ? '' : 's'} · ${pct(abv(r.ingredients))} ABV</div>
          </div>${ICON.chev}</a></li>`).join('')
      : '<li class="row muted">No matches</li>';
  };
  if (listEl) renderList();

  app.oninput = (e) => {
    if (e.target.id === 'search') renderList(e.target.value);
  };

  app.onclick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'example') {
      const now = Date.now();
      recipes.push({ ...structuredClone(EXAMPLE), id: newId(), createdAt: now, updatedAt: now });
      persist();
      listView();
    } else if (action === 'export') {
      exportBackup();
    } else if (action === 'import') {
      document.getElementById('import-file').click();
    }
  };

  app.onchange = async (e) => {
    if (e.target.id !== 'import-file' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      const incoming = (Array.isArray(data) ? data : data.recipes || []).map(normalizeRecipe).filter(Boolean);
      if (!incoming.length) throw new Error('empty');
      for (const r of incoming) {
        const index = recipes.findIndex((x) => x.id === r.id);
        if (index >= 0) recipes[index] = r; else recipes.push(r);
      }
      persist();
      listView();
      toast(`Imported ${incoming.length} cocktail${incoming.length === 1 ? '' : 's'}`);
    } catch {
      toast("That file isn't a cocktail backup");
    }
  };
}

async function exportBackup() {
  const json = JSON.stringify({ app: 'cocktail-scaler', version: 1, exportedAt: new Date().toISOString(), recipes }, null, 2);
  const filename = `cocktails-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], filename, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Cocktail backup' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Recipe detail ----------

function detailView(r) {
  const items = r.ingredients;
  const volume = totalVolumeML(items);
  mount(`
    ${header({ title: r.name, left: backLink('#/', 'Cocktails'), right: `<a class="bar-btn" href="#/r/${esc(r.id)}/edit">Edit</a>` })}
    <main class="content">
      <h1 class="large-title small">${esc(r.name)}</h1>
      <h2 class="section-title">Ingredients</h2>
      <ul class="group">
        ${items.map((i) => `<li class="row">
          <div class="row-main"><div class="row-title">${esc(i.name)}</div><div class="row-sub">${pct(i.abv)} ABV</div></div>
          <span class="row-stack"><strong>${showAmount(i.amount, i.unit)}</strong></span>
        </li>`).join('')}
      </ul>
      <h2 class="section-title">Totals</h2>
      <ul class="group">
        ${kv('Volume', volText(volume))}
        ${kv('ABV', pct(abv(items)))}
        ${r.dilution > 0
          ? kv('Dilution', pct(r.dilution)) +
            kv('Volume after dilution', volText(volume * (1 + r.dilution / 100))) +
            kv('ABV after dilution', pct(abv(items, r.dilution)))
          : ''}
      </ul>
      ${r.notes ? `<h2 class="section-title">Notes</h2><div class="group notes">${esc(r.notes)}</div>` : ''}
      <a class="button primary" href="#/r/${esc(r.id)}/scale">${ICON.scale} Scale recipe</a>
      <button class="button destructive" data-action="delete">Delete cocktail</button>
    </main>`, r.name);

  app.onclick = (e) => {
    if (!e.target.closest('[data-action="delete"]')) return;
    if (!confirm(`Delete “${r.name}”? This can't be undone.`)) return;
    recipes = recipes.filter((x) => x.id !== r.id);
    persist();
    location.replace('#/');
  };
}

// ---------- Recipe editor ----------

const blankIngredient = () => ({ name: '', amount: '', unit: 'ml', abv: '' });

function editorView(existing) {
  const draft = existing
    ? {
        name: existing.name,
        notes: existing.notes,
        dilution: existing.dilution ? String(existing.dilution) : '',
        ingredients: existing.ingredients.map((i) => ({ name: i.name, amount: String(i.amount), unit: i.unit, abv: String(i.abv), buyAs: i.buyAs })),
      }
    : { name: '', notes: '', dilution: '', ingredients: [] };
  if (!draft.ingredients.length) draft.ingredients.push(blankIngredient());
  let dirty = false;
  const exitHref = existing ? `#/r/${existing.id}` : '#/';

  mount(`
    ${header({
      title: existing ? 'Edit Cocktail' : 'New Cocktail',
      left: '<button class="bar-btn" data-action="cancel">Cancel</button>',
      right: '<button class="bar-btn strong" data-action="save">Save</button>',
    })}
    <main class="content">
      <form id="editor" novalidate autocomplete="off">
        <h2 class="section-title">Cocktail</h2>
        <div class="group">
          <input class="field big" data-field="name" placeholder="Name" value="${esc(draft.name)}" aria-label="Cocktail name" enterkeyhint="done">
          <textarea class="field" data-field="notes" rows="2" placeholder="Notes (optional)" aria-label="Notes">${esc(draft.notes)}</textarea>
        </div>

        <h2 class="section-title">Ingredients</h2>
        <div class="group" id="ingredients"></div>
        <button type="button" class="button tinted" data-action="add">${ICON.plus} Add ingredient</button>
        <p class="footnote">ABV is each ingredient's alcohol by volume, e.g. 40 for most spirits and 0 for juice or syrup.</p>

        <h2 class="section-title">Dilution (optional)</h2>
        <div class="group">
          <label class="row">
            <span>Water from ice</span>
            <span class="suffix-input boxed" style="flex:0 0 90px">
              <input class="field" data-field="dilution" inputmode="decimal" placeholder="0" value="${esc(draft.dilution)}" aria-label="Dilution percent">
              <span>%</span>
            </span>
          </label>
        </div>
        <p class="footnote">Roughly 20% for stirred drinks and 25% for shaken. Leave blank to ignore.</p>

        <h2 class="section-title">Totals</h2>
        <ul class="group" id="totals"></ul>
        <p class="error" id="error" hidden></p>
      </form>
    </main>`, existing ? `Edit ${existing.name}` : 'New Cocktail');

  const ingredientsEl = document.getElementById('ingredients');
  const totalsEl = document.getElementById('totals');
  const errorEl = document.getElementById('error');

  const validItems = () => draft.ingredients
    .map((i) => ({
      name: i.name.trim(),
      amount: Math.max(parse(i.amount) ?? 0, 0),
      unit: i.unit,
      abv: clamp(parse(i.abv) ?? 0, 0, 100),
      ...(i.buyAs ? { buyAs: i.buyAs } : {}),
    }))
    .filter((i) => i.name && i.amount > 0);

  const renderIngredients = () => {
    ingredientsEl.innerHTML = draft.ingredients.map((ing, index) => `
      <div class="ingredient" data-index="${index}">
        <div class="ingredient-top">
          <input class="field" data-ing="name" placeholder="Ingredient (e.g. Gin)" value="${esc(ing.name)}" aria-label="Ingredient name">
          <button type="button" class="icon-btn" data-action="remove" aria-label="Remove ingredient">${ICON.x}</button>
        </div>
        <div class="ingredient-bottom">
          <input class="field boxed" data-ing="amount" inputmode="decimal" placeholder="Amount" value="${esc(ing.amount)}" aria-label="Amount">
          <div class="segmented" role="group" aria-label="Unit">
            ${INGREDIENT_UNITS.map((u) => `<button type="button" data-unit="${u}" aria-pressed="${ing.unit === u}">${u}</button>`).join('')}
          </div>
          <span class="suffix-input boxed">
            <input class="field" data-ing="abv" inputmode="decimal" placeholder="ABV" value="${esc(ing.abv)}" aria-label="ABV percent">
            <span>%</span>
          </span>
        </div>
      </div>`).join('');
  };

  const renderTotals = () => {
    const items = validItems();
    const volume = totalVolumeML(items);
    const dilution = Math.max(parse(draft.dilution) ?? 0, 0);
    totalsEl.innerHTML =
      kv('Volume', volText(volume)) +
      kv('ABV', pct(abv(items))) +
      (dilution > 0 ? kv('ABV after dilution', pct(abv(items, dilution))) : '');
  };

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const leave = () => location.replace(exitHref);

  const save = () => {
    const name = draft.name.trim();
    const items = validItems();
    if (!name) return showError('Give your cocktail a name.');
    if (!items.length) return showError('Add at least one ingredient with a name and an amount.');
    const now = Date.now();
    const data = {
      name,
      notes: draft.notes.trim(),
      dilution: clamp(parse(draft.dilution) ?? 0, 0, 100),
      ingredients: items,
      updatedAt: now,
    };
    let id;
    if (existing) {
      Object.assign(existing, data);
      id = existing.id;
    } else {
      id = newId();
      recipes.push({ id, createdAt: now, ...data });
    }
    persist();
    location.replace(`#/r/${id}`);
  };

  renderIngredients();
  renderTotals();

  app.onsubmit = (e) => e.preventDefault();

  app.oninput = (e) => {
    const t = e.target;
    if (t.dataset.field) {
      draft[t.dataset.field] = t.value;
    } else if (t.dataset.ing) {
      draft.ingredients[t.closest('.ingredient').dataset.index][t.dataset.ing] = t.value;
    } else {
      return;
    }
    dirty = true;
    errorEl.hidden = true;
    renderTotals();
  };

  app.onclick = (e) => {
    const unitBtn = e.target.closest('[data-unit]');
    if (unitBtn) {
      const row = unitBtn.closest('.ingredient');
      draft.ingredients[row.dataset.index].unit = unitBtn.dataset.unit;
      row.querySelectorAll('[data-unit]').forEach((b) => b.setAttribute('aria-pressed', b === unitBtn));
      dirty = true;
      renderTotals();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'add') {
      draft.ingredients.push(blankIngredient());
      renderIngredients();
      ingredientsEl.lastElementChild.querySelector('[data-ing="name"]').focus();
    } else if (action === 'remove') {
      draft.ingredients.splice(Number(e.target.closest('.ingredient').dataset.index), 1);
      if (!draft.ingredients.length) draft.ingredients.push(blankIngredient());
      dirty = true;
      renderIngredients();
      renderTotals();
    } else if (action === 'save') {
      save();
    } else if (action === 'cancel') {
      if (!dirty || confirm('Discard your changes?')) leave();
    }
  };
}

// ---------- Scaling ----------

const scaleState = { mode: 'volume', target: '1000', targetUnit: 'ml', servings: '10', output: 'ml', includeDilution: false };

function computeBatch(r, s) {
  const base = totalVolumeML(r.ingredients);
  const addWater = s.includeDilution && r.dilution > 0;
  const waterPerServing = addWater ? base * r.dilution / 100 : 0;
  const serving = base + waterPerServing;
  let factor;
  if (s.mode === 'volume') {
    const target = (parse(s.target) ?? 0) * BATCH_UNITS[s.targetUnit];
    factor = serving > 0 && target > 0 ? target / serving : 0;
  } else {
    factor = Math.max(parse(s.servings) ?? 0, 0);
  }
  return {
    factor,
    waterML: waterPerServing * factor,
    totalML: serving * factor,
    abv: abv(r.ingredients, addWater ? r.dilution : 0),
    lines: r.ingredients.map((i) => ({
      name: i.name,
      ml: volumeML(i) * factor,
      // Also show the amount in the ingredient's own unit when it differs from the output unit.
      original: i.unit === s.output ? null : showAmount(i.amount * factor, i.unit),
    })),
  };
}

function scaleView(r) {
  const s = scaleState;
  if (!(r.dilution > 0)) s.includeDilution = false;

  mount(`
    ${header({ title: 'Scale', left: backLink(`#/r/${esc(r.id)}`, r.name) })}
    <main class="content">
      <h1 class="large-title small">Scale ${esc(r.name)}</h1>
      <h2 class="section-title">Scale by</h2>
      <div class="group pad">
        <div class="segmented" data-group="mode">${seg('volume', 'Total volume', s.mode)}${seg('servings', 'Servings', s.mode)}</div>
        <div id="scale-input"></div>
        ${r.dilution > 0
          ? `<label class="toggle-row"><span>Add dilution water (${pct(r.dilution)})</span>
               <input type="checkbox" class="switch" data-field="includeDilution" ${s.includeDilution ? 'checked' : ''}></label>`
          : ''}
      </div>

      <div class="section-head">
        <h2 class="section-title">Batch</h2>
        <div class="segmented small" data-group="output">${['ml', 'L', 'oz'].map((u) => seg(u, u, s.output)).join('')}</div>
      </div>
      <ul class="group" id="batch"></ul>

      <div class="section-head">
        <h2 class="section-title">Shopping list</h2>
        <div class="segmented small" data-group="region">${Object.entries(REGIONS).map(([k, label]) => seg(k, label, settings.region)).join('')}</div>
      </div>
      <ul class="group" id="shopping"></ul>
      <p class="footnote">Common bottle sizes for each type of ingredient. Tap a type to change it.</p>

      <h2 class="section-title">Summary</h2>
      <ul class="group" id="summary"></ul>

      <button class="button primary" data-action="share">${ICON.share} Share batch recipe</button>
    </main>`, `Scale ${r.name}`);

  const inputEl = document.getElementById('scale-input');
  const batchEl = document.getElementById('batch');
  const summaryEl = document.getElementById('summary');
  const shoppingEl = document.getElementById('shopping');

  const renderInput = () => {
    inputEl.innerHTML = s.mode === 'volume'
      ? `<div class="big-input">
           <input class="field" data-field="target" inputmode="decimal" value="${esc(s.target)}" aria-label="Batch volume">
           <select class="unit-select" data-field="targetUnit" aria-label="Batch unit">
             ${Object.keys(BATCH_UNITS).map((u) => `<option value="${u}" ${u === s.targetUnit ? 'selected' : ''}>${u}</option>`).join('')}
           </select>
         </div>`
      : `<div class="big-input">
           <input class="field" data-field="servings" inputmode="decimal" value="${esc(s.servings)}" aria-label="Number of servings">
           <span>servings</span>
         </div>`;
  };

  const renderResults = () => {
    const b = computeBatch(r, s);
    batchEl.innerHTML =
      b.lines.map((l) => `<li class="row">
        <span class="row-title">${esc(l.name)}</span>
        <span class="row-stack"><strong>${showBatch(l.ml, s.output)}</strong>${l.original ? `<small>${esc(l.original)}</small>` : ''}</span>
      </li>`).join('') +
      (b.waterML > 0
        ? `<li class="row"><span class="row-title">Water</span><span class="row-stack"><strong>${showBatch(b.waterML, s.output)}</strong></span></li>`
        : '');
    summaryEl.innerHTML =
      kv('Scale factor', `×${num(b.factor)}`) +
      (s.mode === 'volume' ? kv('Servings', num(b.factor, 1)) : '') +
      kv('Total volume', showBatch(b.totalML, s.output), 'total') +
      kv('ABV', pct(b.abv));
  };

  /** What to buy for each ingredient: its category and a bottle recommendation. */
  const shoppingList = () => computeBatch(r, s).lines.map((l, index) => {
    const ingredient = r.ingredients[index];
    const autoCategory = guessCategory(ingredient);
    const category = ingredient.buyAs || autoCategory;
    const sizes = BOTTLE_SIZES[settings.region][category];
    return { ...l, index, ingredient, autoCategory, category, rec: sizes ? recommendBottles(l.ml, sizes) : null };
  });

  const bottlesText = (rec) => rec.bottles.map((b) => `${b.count} × ${sizeLabel(b.size)}`).join(' + ');

  const renderShopping = () => {
    const items = shoppingList();
    const totalBottles = items.reduce((sum, item) => sum + (item.rec ? item.rec.count : 0), 0);
    shoppingEl.innerHTML = items.map((item) => {
      const options = [`<option value="auto" ${item.ingredient.buyAs ? '' : 'selected'}>${esc(BUY_CATEGORIES[item.autoCategory])}</option>`]
        .concat(Object.entries(BUY_CATEGORIES)
          .filter(([key]) => item.ingredient.buyAs === key || key !== item.autoCategory)
          .map(([key, label]) => `<option value="${key}" ${item.ingredient.buyAs === key ? 'selected' : ''}>${esc(label)}</option>`))
        .join('');
      let detail;
      if (item.ml <= 0) {
        detail = '<strong>—</strong>';
      } else if (item.rec) {
        detail = `<strong>${bottlesText(item.rec)}</strong>
          <small>need ${showBatch(item.ml, s.output)} · ${showBatch(item.rec.spareML, s.output)} spare</small>`;
      } else {
        detail = `<strong>${showBatch(item.ml, s.output)}</strong><small>make or buy fresh</small>`;
      }
      return `<li class="row">
        <div class="row-main">
          <div class="row-title">${esc(item.name)}</div>
          <select class="buy-select" data-buy="${item.index}" aria-label="How ${esc(item.name)} is sold">${options}</select>
        </div>
        <span class="row-stack">${detail}</span>
      </li>`;
    }).join('') +
      (totalBottles ? `<li class="row total"><span>Bottles to buy</span><span class="row-value">${totalBottles}</span></li>` : '');
  };

  const renderAll = () => {
    renderResults();
    renderShopping();
  };

  const shareText = () => {
    const b = computeBatch(r, s);
    const lines = [`${r.name}: batch ×${num(b.factor)}`];
    for (const l of b.lines) lines.push(`• ${l.name}: ${showBatch(l.ml, s.output)}`);
    if (b.waterML > 0) lines.push(`• Water: ${showBatch(b.waterML, s.output)}`);
    lines.push(`Total: ${showBatch(b.totalML, s.output)} at ${pct(b.abv)} ABV`);
    const toBuy = shoppingList().filter((item) => item.rec);
    if (toBuy.length) {
      lines.push('', 'Shopping list:');
      for (const item of toBuy) lines.push(`• ${item.name}: ${bottlesText(item.rec)}`);
    }
    return lines.join('\n');
  };

  renderInput();
  renderAll();

  const onField = (e) => {
    const t = e.target;
    if (t.dataset.buy !== undefined) {
      // Remember the chosen category on the recipe; "auto" goes back to guessing.
      const ingredient = r.ingredients[Number(t.dataset.buy)];
      if (t.value === 'auto') delete ingredient.buyAs; else ingredient.buyAs = t.value;
      r.updatedAt = Date.now();
      persist();
      renderShopping();
      return;
    }
    const field = t.dataset.field;
    if (!field) return;
    s[field] = t.type === 'checkbox' ? t.checked : t.value;
    renderAll();
  };
  app.oninput = onField;
  app.onchange = onField;

  app.onclick = async (e) => {
    const segBtn = e.target.closest('[data-group] button');
    if (segBtn) {
      const group = segBtn.parentElement.dataset.group;
      segBtn.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === segBtn));
      if (group === 'region') {
        settings.region = segBtn.dataset.value;
        saveSettings();
      } else {
        s[group] = segBtn.dataset.value;
        if (group === 'mode') renderInput();
      }
      renderAll();
      return;
    }
    if (e.target.closest('[data-action="share"]')) {
      const text = shareText();
      if (navigator.share) {
        try { await navigator.share({ title: `${r.name} batch`, text }); } catch { /* cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          toast('Batch recipe copied');
        } catch {
          toast("Couldn't copy the recipe");
        }
      }
    }
  };
}

// ---------- Router ----------

function route() {
  const [view, id, sub] = location.hash.replace(/^#\/?/, '').split('/');
  if (view === 'new') return editorView(null);
  if (view === 'r') {
    const recipe = findRecipe(id);
    if (!recipe) return location.replace('#/');
    if (sub === 'edit') return editorView(recipe);
    if (sub === 'scale') return scaleView(recipe);
    return detailView(recipe);
  }
  listView();
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
navigator.storage?.persist?.().catch(() => {});
