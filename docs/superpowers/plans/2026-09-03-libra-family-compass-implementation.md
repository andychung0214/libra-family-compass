# 秤心育兒指南 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可直接部署於 GitHub Pages 的「秤心育兒指南」，整合孕期提醒、待產包、臺北市補助篩選、托育比較與兩名子女花費試算。

**Architecture:** 使用無建構步驟的 HTML、CSS 與原生 ES Modules。領域規則與資料模組不操作 DOM，由 `app.js`、`state.js` 與 `render.js` 協調介面；核心政策採有來源日期的靜態資料，臺北市非資格判定資訊使用開放資料並保留本機備援。

**Tech Stack:** HTML5、CSS Custom Properties、原生 JavaScript ES Modules、`localStorage`、Node.js `node:test`、GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-02-libra-family-compass-design.md`

## Global Constraints

- 專案名稱固定為 `libra-family-compass`，中文名稱固定為「秤心育兒指南」。
- 僅使用 HTML、CSS、原生 JavaScript、Canvas、Web Audio API、`localStorage` 與原生 ES Modules；首版不需要 Canvas 或 Web Audio API。
- 不使用執行期框架、外部字體 CDN、分析追蹤、後端、資料庫、憑證、token、`.env` 或私人金鑰。
- 所有中文文件、註解及 UI 文案使用繁體中文，並遵守專案 `AGENTS.md` 的名詞翻譯規範。
- 所有內部資源採相對路徑，確保 GitHub Pages 子路徑部署相容。
- 補助與醫療內容必須具有官方 HTTPS 來源及 `2026-09-02` 或更新的查核日期；資格與費用結果只能標示為初步整理或試算。
- 使用者資料只存於 `libraFamilyCompass:v1:` 前綴的 `localStorage` 鍵，不儲存敏感個人資料。
- 酒紅色為預設主題，倫敦藍為可保存的替代主題。
- 至少支援 375px、768px、1440px 三種檢視寬度及 WCAG 2.2 AA 基本要求。
- 每個實作任務採測試先行，先看見預期失敗，再加入最小實作並重跑測試。
- Commit 訊息使用 Conventional Commits，描述必須是繁體中文。

---

### Task 1: Repository foundation and zero-dependency test harness

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `package.json`
- Create: `scripts/serve.mjs`
- Create: `scripts/validate-content.mjs`
- Create: `tests/foundation.test.mjs`

**Interfaces:**
- Consumes: Node.js 內建 `http`、`fs`、`path`、`url` 模組。
- Produces: `npm test`、`npm run validate`、`npm run serve` 三個零相依指令；`scripts/serve.mjs` 於 `127.0.0.1:4173` 提供靜態檔案。

- [ ] **Step 1: Write the failing foundation test**

```js
// tests/foundation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package scripts use only built-in Node tools', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal(pkg.scripts.validate, 'node scripts/validate-content.mjs');
  assert.equal(pkg.scripts.serve, 'node scripts/serve.mjs');
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.deepEqual(pkg.devDependencies ?? {}, {});
});
```

- [ ] **Step 2: Run the foundation test and confirm the expected failure**

Run: `node --test tests/foundation.test.mjs`

Expected: FAIL because `package.json` does not exist.

- [ ] **Step 3: Add repository metadata and scripts**

```json
{
  "name": "libra-family-compass",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "秤心育兒指南：臺灣孕產與育兒補助決策工具",
  "scripts": {
    "test": "node --test",
    "validate": "node scripts/validate-content.mjs",
    "serve": "node scripts/serve.mjs"
  },
  "engines": { "node": ">=20" }
}
```

`.gitignore` 必須忽略作業系統與編輯器暫存、coverage、`node_modules`、`.env` 及其變體；不得忽略網站原始檔。`LICENSE` 使用完整 MIT License，年份為 2026，著作權人為 `Libra Family Compass contributors`。

`scripts/serve.mjs` 使用 `createServer`，只解析目前專案目錄內的相對 URL；目錄路徑回傳 `index.html`，不存在檔案回傳 `404.html` 或純文字 404，並為 HTML、CSS、JS、SVG、JSON、XML、Web Manifest 設定正確 MIME type。任何解析後不在專案根目錄內的路徑回傳 403。

`scripts/validate-content.mjs` 先提供可在檔案尚未齊全時回傳非零退出碼的必要檔案檢查，完整內容驗證在 Task 7 擴充。

- [ ] **Step 4: Run the foundation test and repository checks**

Run: `node --test tests/foundation.test.mjs`

Expected: PASS, 1 test.

Run: `git diff --check`

Expected: exit 0 and no whitespace errors.

- [ ] **Step 5: Commit the foundation**

```bash
git add .gitignore LICENSE package.json scripts/serve.mjs scripts/validate-content.mjs tests/foundation.test.mjs
git commit -m "chore: 建立零相依專案基礎"
```

---

### Task 2: Pregnancy calculations and verified pregnancy guide

**Files:**
- Create: `js/pregnancy.js`
- Create: `js/data/pregnancy-guide.js`
- Create: `tests/pregnancy.test.mjs`
- Create: `tests/pregnancy-content.test.mjs`

**Interfaces:**
- Consumes: `{ referenceDate, pregnancyWeek, pregnancyDay, dueDate }` settings and an optional current date.
- Produces: `calculatePregnancyProgress(settings, today)`, `getUpcomingMilestones(progress, milestones, limit)` and exports `pregnancyMilestones`, `urgentSigns`, `pregnancySources`.

- [ ] **Step 1: Write failing pregnancy tests**

```js
// tests/pregnancy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePregnancyProgress, getUpcomingMilestones } from '../js/pregnancy.js';

test('keeps the approved 32-week baseline on 2026-09-02', () => {
  const result = calculatePregnancyProgress(
    { referenceDate: '2026-09-02', pregnancyWeek: 32, pregnancyDay: 0, dueDate: null },
    new Date('2026-09-02T12:00:00+08:00')
  );
  assert.deepEqual(result, { week: 32, day: 0, mode: 'reference', valid: true });
});

test('advances across calendar boundaries without local-time drift', () => {
  const result = calculatePregnancyProgress(
    { referenceDate: '2026-12-30', pregnancyWeek: 40, pregnancyDay: 0, dueDate: null },
    new Date('2027-01-02T12:00:00+08:00')
  );
  assert.equal(result.week, 40);
  assert.equal(result.day, 3);
});

test('uses a due date as a 40-week estimate', () => {
  const result = calculatePregnancyProgress(
    { referenceDate: null, pregnancyWeek: null, pregnancyDay: null, dueDate: '2026-10-21' },
    new Date('2026-09-02T12:00:00+08:00')
  );
  assert.equal(result.mode, 'due-date');
  assert.equal(result.valid, true);
  assert.equal(result.week, 33);
});

test('rejects progress outside 0 to 42 weeks', () => {
  const result = calculatePregnancyProgress(
    { referenceDate: '2026-01-01', pregnancyWeek: 0, pregnancyDay: 0, dueDate: null },
    new Date('2026-12-31T12:00:00+08:00')
  );
  assert.equal(result.valid, false);
});

test('returns the next milestones in week order', () => {
  const result = getUpcomingMilestones(
    { week: 32, day: 0, valid: true },
    [{ id: 'gbs', startWeek: 35 }, { id: 'ultrasound', startWeek: 32 }, { id: 'past', startWeek: 28 }],
    2
  );
  assert.deepEqual(result.map(({ id }) => id), ['ultrasound', 'gbs']);
});
```

```js
// tests/pregnancy-content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pregnancyMilestones, urgentSigns, pregnancySources } from '../js/data/pregnancy-guide.js';

test('pregnancy content includes the official late-pregnancy milestones', () => {
  assert.ok(pregnancyMilestones.some(({ id, startWeek }) => id === 'third-ultrasound' && startWeek === 32));
  assert.ok(pregnancyMilestones.some(({ id, startWeek, endWeek }) => id === 'gbs-screening' && startWeek === 35 && endWeek === 37));
  assert.ok(urgentSigns.some(({ id }) => id === 'water-breaking'));
  assert.ok(urgentSigns.some(({ id }) => id === 'vaginal-bleeding'));
});

test('all pregnancy sources are official HTTPS pages with a verification date', () => {
  for (const source of pregnancySources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.verifiedAt, /^2026-09-0[23]$/);
    assert.ok(source.issuer.includes('衛生福利部'));
  }
});
```

- [ ] **Step 2: Run the tests and confirm module-not-found failures**

Run: `node --test tests/pregnancy.test.mjs tests/pregnancy-content.test.mjs`

Expected: FAIL because `js/pregnancy.js` and `js/data/pregnancy-guide.js` do not exist.

- [ ] **Step 3: Implement pregnancy calculations**

```js
// js/pregnancy.js
const DAY_MS = 86_400_000;

function utcDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function calculatePregnancyProgress(settings, today = new Date()) {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  let totalDays;
  let mode;

  if (settings.dueDate) {
    totalDays = 280 - Math.round((utcDay(settings.dueDate) - todayUtc) / DAY_MS);
    mode = 'due-date';
  } else {
    const reference = utcDay(settings.referenceDate);
    const baseline = Number(settings.pregnancyWeek) * 7 + Number(settings.pregnancyDay ?? 0);
    totalDays = baseline + Math.round((todayUtc - reference) / DAY_MS);
    mode = 'reference';
  }

  const valid = Number.isFinite(totalDays) && totalDays >= 0 && totalDays <= 294;
  return {
    week: valid ? Math.floor(totalDays / 7) : null,
    day: valid ? totalDays % 7 : null,
    mode,
    valid
  };
}

export function getUpcomingMilestones(progress, milestones, limit = 3) {
  if (!progress.valid) return [];
  return milestones
    .filter(({ endWeek = 42 }) => endWeek >= progress.week)
    .sort((a, b) => a.startWeek - b.startWeek)
    .slice(0, limit);
}
```

Create `pregnancy-guide.js` with the 14 prenatal visit ranges, third ultrasound from week 32, GBS screening from week 35 through week 37, preparation from week 32, and urgent signs for bleeding, water breaking, regular contractions, persistent abdominal pain, reduced fetal movement and severe headache or vision change. Each record must link to the National Health Administration source and use `verifiedAt: '2026-09-02'` or `2026-09-03`.

- [ ] **Step 4: Run pregnancy tests and validate content**

Run: `node --test tests/pregnancy.test.mjs tests/pregnancy-content.test.mjs`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit pregnancy logic and content**

```bash
git add js/pregnancy.js js/data/pregnancy-guide.js tests/pregnancy.test.mjs tests/pregnancy-content.test.mjs
git commit -m "feat: 建立孕週與產檢提醒資料"
```

---

### Task 3: Subsidy catalogue and explainable eligibility engine

**Files:**
- Create: `js/data/benefits.js`
- Create: `js/eligibility.js`
- Create: `tests/benefits-content.test.mjs`
- Create: `tests/eligibility.test.mjs`

**Interfaces:**
- Consumes: benefit records and `{ region, childOrder, childStage, careMode, householdTags }` profile.
- Produces: `benefits`, `benefitSources`, `evaluateBenefit(benefit, profile, onDate)`, `filterBenefits(benefits, filters)` and `formatBenefitAmount(amount)`.

- [ ] **Step 1: Write failing catalogue and eligibility tests**

```js
// tests/benefits-content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { benefits } from '../js/data/benefits.js';

const requiredIds = [
  'prenatal-checkups', 'taipei-good-pregnancy-2u', 'national-birth-benefit-2026',
  'taipei-birth-award', 'under-2-parenting-allowance', 'public-childcare-subsidy',
  'quasi-public-childcare-subsidy', 'taipei-friendly-childcare',
  'age-2-to-5-parenting-allowance', 'age-5-schooling-subsidy',
  'preschool-tax-deduction', 'rental-subsidy-family', 'family-parking-permit'
];

test('catalogue contains every approved general-family programme', () => {
  for (const id of requiredIds) assert.ok(benefits.some((benefit) => benefit.id === id), id);
});

test('each benefit has auditable official metadata', () => {
  for (const benefit of benefits) {
    assert.ok(benefit.title);
    assert.ok(benefit.source.issuer);
    assert.match(benefit.source.url, /^https:\/\//);
    assert.match(benefit.source.verifiedAt, /^2026-09-0[23]$/);
    assert.ok(['current', 'scheduled', 'conditional'].includes(benefit.status));
    assert.ok(Array.isArray(benefit.requirements));
    assert.ok(Array.isArray(benefit.exclusions));
  }
});
```

```js
// tests/eligibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBenefit, filterBenefits, formatBenefitAmount } from '../js/eligibility.js';

const benefit = {
  jurisdiction: 'taipei', stages: ['under-2'], childOrders: [2, 3], careModes: ['home'],
  effectiveFrom: '2026-01-01', requirements: ['設籍臺北市'], exclusions: ['不可同領托育補助'],
  amount: { kind: 'monthly', value: 6000, unit: 'TWD' }
};

test('marks the approved second-child home-care scenario as likely', () => {
  const result = evaluateBenefit(benefit, {
    region: 'taipei', childOrder: 2, childStage: 'under-2', careMode: 'home', householdTags: []
  }, '2026-09-03');
  assert.equal(result.status, 'likely');
});

test('explains a conflicting childcare scenario', () => {
  const result = evaluateBenefit(benefit, {
    region: 'taipei', childOrder: 2, childStage: 'under-2', careMode: 'quasi-public', householdTags: []
  }, '2026-09-03');
  assert.equal(result.status, 'not-match');
  assert.ok(result.reasons.some((reason) => reason.includes('照顧方式')));
});

test('uses check when profile information is missing', () => {
  const result = evaluateBenefit(benefit, { region: 'taipei' }, '2026-09-03');
  assert.equal(result.status, 'check');
});

test('formats monthly New Taiwan dollar values', () => {
  assert.equal(formatBenefitAmount(benefit.amount), '每月 NT$6,000');
});

test('filters by stage and text without mutating source data', () => {
  const source = [{ id: 'a', title: '生育獎勵金', stages: ['birth'], tags: ['臺北市'] }];
  assert.equal(filterBenefits(source, { stage: 'birth', query: '獎勵' }).length, 1);
  assert.equal(source.length, 1);
});
```

- [ ] **Step 2: Run tests and confirm expected module failures**

Run: `node --test tests/benefits-content.test.mjs tests/eligibility.test.mjs`

Expected: FAIL because the benefit modules do not exist.

- [ ] **Step 3: Implement the catalogue and engine**

Use this record shape consistently in `benefits.js`:

```js
{
  id: 'taipei-birth-award',
  title: '臺北市生育獎勵金',
  summary: '第二名新生兒符合設籍條件時可申請。',
  jurisdiction: 'taipei',
  stages: ['birth'],
  childOrders: [1, 2, 3],
  careModes: ['any'],
  effectiveFrom: '2025-09-09',
  amount: { kind: 'tiered', tiers: { 1: 40000, 2: 45000, 3: 50000 }, unit: 'TWD' },
  requirements: ['新生兒完成出生登記或初設戶籍登記且仍設籍臺北市', '父或母符合連續設籍規定'],
  exclusions: [],
  application: {
    deadline: '完成出生登記者原則上應於出生日次日起 60 日內申請',
    channels: ['出生登記受理戶政事務所', '新生兒設籍所在地戶政事務所'],
    documents: ['申請書', '申請人身分證明文件', '金融機構帳戶資料']
  },
  source: {
    issuer: '臺北市政府',
    title: '臺北市生育獎勵金發放辦法',
    url: 'https://laws.gov.taipei/law/LawSearch/LawArticleContent/FL081869',
    verifiedAt: '2026-09-03'
  },
  status: 'current',
  tags: ['生產', '設籍', '一次性']
}
```

`eligibility.js` must compare region, stage, child order, care mode and effective date. A missing profile field returns `check`; a definite mismatch returns `not-match`; otherwise return `likely`. `reasons` must be human-readable Traditional Chinese. `filterBenefits` performs case-insensitive title, summary and tag matching and supports `all` for any filter. `formatBenefitAmount` handles `fixed`, `monthly`, `up-to`, `tiered` and `formula` without inventing a numeric amount.

- [ ] **Step 4: Run catalogue and eligibility tests**

Run: `node --test tests/benefits-content.test.mjs tests/eligibility.test.mjs`

Expected: PASS, 7 tests.

Run: `npm test`

Expected: all current tests pass.

- [ ] **Step 5: Commit subsidy data and rules**

```bash
git add js/data/benefits.js js/eligibility.js tests/benefits-content.test.mjs tests/eligibility.test.mjs
git commit -m "feat: 建立補助資料與資格提示"
```

---

### Task 4: Cost summaries, safe local storage and application state

**Files:**
- Create: `js/costs.js`
- Create: `js/storage.js`
- Create: `js/state.js`
- Create: `tests/costs.test.mjs`
- Create: `tests/storage.test.mjs`
- Create: `tests/state.test.mjs`

**Interfaces:**
- Consumes: cost entries, storage-compatible object and initial application state.
- Produces: `normaliseMoney(value)`, `summariseCosts(entries)`, `createStorage(storageLike, onError)`, `createState(initialState, persistence)`.

- [ ] **Step 1: Write failing cost and persistence tests**

```js
// tests/costs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseMoney, summariseCosts } from '../js/costs.js';

test('normalises invalid and negative money to zero', () => {
  assert.equal(normaliseMoney('abc'), 0);
  assert.equal(normaliseMoney(-500), 0);
  assert.equal(normaliseMoney('1,250'), 1250);
});

test('summarises monthly and one-time costs and subsidies', () => {
  const result = summariseCosts([
    { cadence: 'monthly', expense: 10000, subsidy: 6000 },
    { cadence: 'once', expense: 24000, subsidy: 45000 }
  ]);
  assert.deepEqual(result, {
    monthlyExpense: 10000, monthlySubsidy: 6000, annualExpense: 144000,
    annualSubsidy: 117000, annualNet: 27000
  });
});
```

```js
// tests/storage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}

test('round-trips a versioned value', () => {
  const storage = createStorage(memoryStorage());
  assert.equal(storage.save('theme', 'london-blue'), true);
  assert.equal(storage.load('theme', 'wine-red'), 'london-blue');
});

test('falls back after malformed JSON', () => {
  const storage = createStorage(memoryStorage({ 'libraFamilyCompass:v1:theme': '{bad' }));
  assert.equal(storage.load('theme', 'wine-red'), 'wine-red');
});

test('removeAll only removes this application prefix', () => {
  const raw = memoryStorage({
    'libraFamilyCompass:v1:theme': '"wine-red"',
    'another-site:key': 'keep'
  });
  createStorage(raw).removeAll();
  assert.equal(raw.getItem('another-site:key'), 'keep');
});
```

```js
// tests/state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../js/state.js';

test('updates immutable state and notifies subscribers', () => {
  const saved = [];
  const store = createState({ theme: 'wine-red' }, { save: (key, value) => saved.push([key, value]) });
  let observed;
  store.subscribe((state) => { observed = state; });
  store.update({ theme: 'london-blue' });
  assert.equal(observed.theme, 'london-blue');
  assert.deepEqual(saved.at(-1), ['state', observed]);
});
```

- [ ] **Step 2: Run tests and confirm expected module failures**

Run: `node --test tests/costs.test.mjs tests/storage.test.mjs tests/state.test.mjs`

Expected: FAIL because the three implementation modules do not exist.

- [ ] **Step 3: Implement cost, storage and state modules**

```js
// js/costs.js
export function normaliseMoney(value) {
  const amount = Number(String(value ?? '').replaceAll(',', ''));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function summariseCosts(entries) {
  const total = entries.reduce((sum, entry) => {
    const multiplier = entry.cadence === 'monthly' ? 12 : 1;
    const expense = normaliseMoney(entry.expense);
    const subsidy = normaliseMoney(entry.subsidy);
    if (entry.cadence === 'monthly') {
      sum.monthlyExpense += expense;
      sum.monthlySubsidy += subsidy;
    }
    sum.annualExpense += expense * multiplier;
    sum.annualSubsidy += subsidy * multiplier;
    return sum;
  }, { monthlyExpense: 0, monthlySubsidy: 0, annualExpense: 0, annualSubsidy: 0 });
  return { ...total, annualNet: Math.max(0, total.annualExpense - total.annualSubsidy) };
}
```

`createStorage` prefixes every key with `libraFamilyCompass:v1:`, catches storage and JSON errors, calls `onError` with a Traditional Chinese message, and returns safe fallbacks. `createState` returns `{ getState, subscribe, update, reset }`, clones arrays and plain objects before exposing state, persists under key `state`, and returns an unsubscribe function from `subscribe`.

- [ ] **Step 4: Run persistence tests and the complete suite**

Run: `node --test tests/costs.test.mjs tests/storage.test.mjs tests/state.test.mjs`

Expected: PASS, 6 tests.

Run: `npm test`

Expected: all current tests pass.

- [ ] **Step 5: Commit domain state modules**

```bash
git add js/costs.js js/storage.js js/state.js tests/costs.test.mjs tests/storage.test.mjs tests/state.test.mjs
git commit -m "feat: 建立花費與本機狀態管理"
```

---

### Task 5: Semantic page shell and editorial visual system

**Files:**
- Create: `index.html`
- Create: `assets/styles/tokens.css`
- Create: `assets/styles/base.css`
- Create: `assets/styles/components.css`
- Create: `assets/styles/responsive.css`
- Create: `assets/icons/mark.svg`
- Create: `assets/icons/favicon.svg`
- Create: `js/data/hospital-bag.js`
- Create: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: semantic section IDs and design tokens from the approved spec.
- Produces: sections `today`, `pregnancy`, `benefits`, `hospital-bag`, `costs`, `sources`; theme tokens selected through `html[data-theme]`; exports `hospitalBagItems`.

- [ ] **Step 1: Write the failing page-shell test**

```js
// tests/page-shell.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('page contains semantic landmarks and all approved sections', () => {
  assert.match(html, /<html lang="zh-Hant"/);
  assert.match(html, /<a class="skip-link" href="#main-content">/);
  assert.match(html, /<main id="main-content"/);
  for (const id of ['today', 'pregnancy', 'benefits', 'hospital-bag', 'costs', 'sources']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('page exposes accessible controls and a module entry point', () => {
  assert.match(html, /id="theme-toggle"[^>]*aria-label=/);
  assert.match(html, /id="benefit-query"[^>]*<|id="benefit-query"/);
  assert.match(html, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});
```

- [ ] **Step 2: Run the page-shell test and confirm the missing-file failure**

Run: `node --test tests/page-shell.test.mjs`

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 3: Build the semantic HTML and CSS system**

`index.html` starts with this structure and contains all six sections as real HTML rather than empty application roots:

```html
<!doctype html>
<html lang="zh-Hant" data-theme="wine-red">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>秤心育兒指南｜臺北孕產與育兒補助整理</title>
  <meta name="description" content="整理孕期提醒、待產包、臺北市育兒補助、托育選擇與兩名子女家庭花費。">
  <link rel="stylesheet" href="./assets/styles/tokens.css">
  <link rel="stylesheet" href="./assets/styles/base.css">
  <link rel="stylesheet" href="./assets/styles/components.css">
  <link rel="stylesheet" href="./assets/styles/responsive.css">
</head>
<body>
  <a class="skip-link" href="#main-content">跳至主要內容</a>
  <header class="site-header">
    <a class="brand" href="#today" aria-label="秤心育兒指南首頁">秤心育兒指南</a>
    <nav aria-label="主要導覽"></nav>
    <button id="theme-toggle" type="button" aria-label="切換為倫敦藍主題"></button>
  </header>
  <main id="main-content">
    <section id="today" aria-labelledby="today-title"></section>
    <section id="pregnancy" aria-labelledby="pregnancy-title"></section>
    <section id="benefits" aria-labelledby="benefits-title"></section>
    <section id="hospital-bag" aria-labelledby="hospital-bag-title"></section>
    <section id="costs" aria-labelledby="costs-title"></section>
    <section id="sources" aria-labelledby="sources-title"></section>
  </main>
  <p class="sr-only" id="status-message" aria-live="polite"></p>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

The real file must include section headings, explanatory copy, forms, filters, templates or containers with accessible names, official-information disclaimer, emergency `119` text and a no-script summary. `hospital-bag.js` includes approved categories and unique IDs for every item.

`tokens.css` defines `--color-primary`, `--color-primary-deep`, `--color-primary-soft`, `--color-accent`, `--color-paper`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-line`, `--color-alert`, spacing, type and radius scales. Default `:root` is wine red; `html[data-theme='london-blue']` overrides the four theme values. CSS must avoid gradients, glass effects, excessive shadows and pill-only component styling.

`responsive.css` implements mobile under 640px, tablet 640–1023px and desktop 1024px and above. Touch targets are at least 44px; `@media (prefers-reduced-motion: reduce)` disables nonessential transitions and smooth scrolling.

- [ ] **Step 4: Run page-shell and all automated tests**

Run: `node --test tests/page-shell.test.mjs`

Expected: PASS, 2 tests.

Run: `npm test`

Expected: all current tests pass.

- [ ] **Step 5: Commit the page shell and design system**

```bash
git add index.html assets js/data/hospital-bag.js tests/page-shell.test.mjs
git commit -m "feat: 建立日系家庭生活誌介面"
```

---

### Task 6: Interactive dashboard, checklist, subsidy finder and cost ledger

**Files:**
- Create: `js/render.js`
- Create: `js/app.js`
- Create: `tests/render.test.mjs`
- Modify: `index.html`
- Modify: `assets/styles/components.css`
- Modify: `assets/styles/responsive.css`

**Interfaces:**
- Consumes: domain modules from Tasks 2–4, `benefits`, `pregnancyMilestones`, `urgentSigns`, `hospitalBagItems` and named DOM containers.
- Produces: `createElement(tag, options)`, `renderPregnancy`, `renderBenefits`, `renderChecklist`, `renderCosts`, and a fully interactive site initialized by `app.js`.

- [ ] **Step 1: Write a failing safe-render helper test**

```js
// tests/render.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTextModel, checklistProgress, nextTheme } from '../js/render.js';

test('text model keeps user input as text instead of markup', () => {
  assert.deepEqual(makeTextModel('<img src=x onerror=alert(1)>'), {
    text: '<img src=x onerror=alert(1)>'
  });
});

test('checklist progress handles empty and partial lists', () => {
  assert.deepEqual(checklistProgress([], new Set()), { complete: 0, total: 0, percent: 0 });
  assert.deepEqual(checklistProgress([{ id: 'a' }, { id: 'b' }], new Set(['a'])), {
    complete: 1, total: 2, percent: 50
  });
});

test('theme toggles between the only two allowed values', () => {
  assert.equal(nextTheme('wine-red'), 'london-blue');
  assert.equal(nextTheme('london-blue'), 'wine-red');
  assert.equal(nextTheme('unknown'), 'wine-red');
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --test tests/render.test.mjs`

Expected: FAIL because `js/render.js` does not exist.

- [ ] **Step 3: Implement pure render helpers and DOM renderers**

```js
// beginning of js/render.js
import { formatBenefitAmount } from './eligibility.js';
import { summariseCosts } from './costs.js';

export const makeTextModel = (value) => ({ text: String(value ?? '') });

export function checklistProgress(items, completed) {
  const complete = items.filter(({ id }) => completed.has(id)).length;
  const total = items.length;
  return { complete, total, percent: total ? Math.round((complete / total) * 100) : 0 };
}

export function nextTheme(theme) {
  if (theme === 'wine-red') return 'london-blue';
  if (theme === 'london-blue') return 'wine-red';
  return 'wine-red';
}

export function createElement(tag, { className = '', text = '', attrs = {} } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
  return element;
}
```

Add DOM renderers that clear only their known container, create nodes through `createElement`, preserve focus where practical, and use `DocumentFragment` for lists. Benefit cards display status text, amount, summary, requirements, exclusions, application deadline and a `target="_blank" rel="noopener noreferrer"` official link. Cost rendering uses `Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 })`.

- [ ] **Step 4: Wire application events and persistence**

`app.js` must:

1. Load safe defaults and persisted state through `createStorage` and `createState`.
2. Compute pregnancy progress using the current local date.
3. Render upcoming pregnancy actions, urgent signs, benefits, checklist and costs.
4. Update benefit filters on `input` and `change` without reloading.
5. Save theme, checklist, custom checklist items, family settings and cost entries.
6. Update `#status-message` after saved changes without announcing every keystroke.
7. Confirm before removing a custom checklist item or clearing all application data.
8. Apply `data-theme` before the first interactive render and update the theme button label.
9. Never send family settings to external services.

Add form validation messages adjacent to invalid pregnancy and money fields. Use event delegation for generated benefit cards and checklist rows. The default state includes the approved 32-week reference and two-child profile.

- [ ] **Step 5: Run interaction helper tests and the complete suite**

Run: `node --test tests/render.test.mjs`

Expected: PASS, 3 tests.

Run: `npm test`

Expected: all current tests pass.

- [ ] **Step 6: Start the site and perform the first browser milestone**

Run: `npm run serve`

Expected: server reports `http://127.0.0.1:4173`.

Browser checks:

- Open the local URL with no console error.
- Confirm the wine-red theme is visible by default.
- Switch to London blue, reload, and confirm it persists.
- Check a hospital-bag item, reload, and confirm it remains checked.
- Search for `生育`, select the second-child profile and confirm relevant benefit cards remain.
- Add a monthly expense and subsidy and confirm the summary changes.
- Capture desktop and mobile screenshots for visual inspection.

- [ ] **Step 7: Commit interactive features**

```bash
git add js/app.js js/render.js index.html assets/styles/components.css assets/styles/responsive.css tests/render.test.mjs
git commit -m "feat: 完成家庭補助與待產互動工具"
```

---

### Task 7: Open-data adapter with timeout and local fallback

**Files:**
- Create: `js/open-data.js`
- Create: `js/data/open-data-fallback.js`
- Create: `tests/open-data.test.mjs`
- Modify: `js/app.js`
- Modify: `js/render.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `fetch`-compatible function, official endpoint URL, fallback rows and timeout.
- Produces: `loadOpenData({ fetchFn, url, fallback, timeoutMs })` returning `{ rows, mode, message, fetchedAt }`; renders data status without affecting eligibility logic.

- [ ] **Step 1: Write failing adapter tests**

```js
// tests/open-data.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOpenData } from '../js/open-data.js';

test('returns validated live rows', async () => {
  const result = await loadOpenData({
    fetchFn: async () => ({ ok: true, json: async () => ({ result: { results: [{ name: '測試托嬰中心' }] } }) }),
    url: 'https://data.taipei/example', fallback: [], timeoutMs: 50
  });
  assert.equal(result.mode, 'live');
  assert.equal(result.rows[0].name, '測試托嬰中心');
});

test('returns fallback after network or format errors', async () => {
  const fallback = [{ name: '本機備援', verifiedAt: '2026-09-03' }];
  const result = await loadOpenData({
    fetchFn: async () => { throw new Error('offline'); },
    url: 'https://data.taipei/example', fallback, timeoutMs: 50
  });
  assert.equal(result.mode, 'fallback');
  assert.deepEqual(result.rows, fallback);
  assert.match(result.message, /備援資料/);
});
```

- [ ] **Step 2: Run tests and confirm the missing-module failure**

Run: `node --test tests/open-data.test.mjs`

Expected: FAIL because `js/open-data.js` does not exist.

- [ ] **Step 3: Implement the adapter and dated fallback**

```js
// js/open-data.js
export async function loadOpenData({ fetchFn = fetch, url, fallback, timeoutMs = 6000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const rows = payload?.result?.results ?? payload?.results ?? payload;
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('invalid data');
    return { rows, mode: 'live', message: '已載入臺北市開放資料', fetchedAt: new Date().toISOString() };
  } catch {
    return { rows: fallback, mode: 'fallback', message: '目前使用有日期標示的本機備援資料', fetchedAt: null };
  } finally {
    clearTimeout(timer);
  }
}
```

`open-data-fallback.js` stores only non-sensitive public facility summaries and the official dataset page URLs. During implementation, inspect the data platform's current downloadable/API resource URL and browser CORS behavior. If it cannot be called from GitHub Pages, set the UI to fallback mode by default and provide the official dataset link; do not introduce a proxy.

- [ ] **Step 4: Run adapter tests and browser failure-mode checks**

Run: `node --test tests/open-data.test.mjs`

Expected: PASS, 2 tests.

Run: `npm test`

Expected: all current tests pass.

Browser checks:

- With network available, status accurately reports live or fallback mode.
- With the endpoint blocked, core benefit cards, pregnancy content and checklist continue working.
- No family setting appears in the external request URL, query string or request body.

- [ ] **Step 5: Commit open-data support**

```bash
git add js/open-data.js js/data/open-data-fallback.js js/app.js js/render.js index.html tests/open-data.test.mjs
git commit -m "feat: 加入臺北托育開放資料備援"
```

---

### Task 8: SEO, documentation, content validation and release verification

**Files:**
- Create: `404.html`
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `site.webmanifest`
- Create: `assets/icons/social-preview.svg`
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/PLAN.md`
- Create: `docs/ART-DIRECTION.md`
- Create: `docs/TEST-PLAN.md`
- Create: `tests/static-site.test.mjs`
- Modify: `index.html`
- Modify: `scripts/validate-content.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: all implementation files, approved spec, source metadata and final GitHub repository URL.
- Produces: complete required documentation, GitHub Pages metadata, executable content validation and final verification evidence.

- [ ] **Step 1: Write failing static-site tests**

```js
// tests/static-site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'README.md', 'CONTRIBUTING.md', 'LICENSE', '.gitignore', 'index.html', '404.html',
  'robots.txt', 'sitemap.xml', 'site.webmanifest', 'docs/PLAN.md',
  'docs/ART-DIRECTION.md', 'docs/TEST-PLAN.md'
];

test('all required delivery files exist', async () => {
  await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));
});

test('index includes SEO and structured data without root-relative assets', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /property="og:title"/);
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /rel="manifest" href="\.\/site\.webmanifest"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});

test('documentation contains requested operational sections', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const heading of ['特色', '操作方式', '安裝與執行', '專案結構', '測試方式', 'GitHub Pages', '已知限制', '授權']) {
    assert.match(readme, new RegExp(`## ${heading}`));
  }
});
```

- [ ] **Step 2: Run tests and confirm missing-delivery-file failures**

Run: `node --test tests/static-site.test.mjs`

Expected: FAIL and list the not-yet-created delivery files.

- [ ] **Step 3: Add SEO and static deployment files**

Add canonical and Open Graph URLs using `https://andychung0214.github.io/libra-family-compass/`, a local SVG social preview fallback, `WebSite`, `ItemList` and `FAQPage` JSON-LD, and the web manifest. `robots.txt` allows crawling and points to the sitemap. `sitemap.xml` contains the GitHub Pages canonical URL. `404.html` provides an accessible relative return link and does not use redirect loops.

- [ ] **Step 4: Write all required project documents**

`README.md` must describe the information website rather than a game and contain the exact headings enforced by the test. Include `npm run serve`, `npm test`, `npm run validate`, GitHub Pages branch deployment steps, source-verification limitations, medical and eligibility disclaimers, privacy behavior and MIT licensing.

`docs/PLAN.md` mirrors the approved requirements, scope, completed milestones, work breakdown, risks and measurable acceptance conditions. `docs/ART-DIRECTION.md` records both themes, type strategy, spacing, component states, responsive rules, motion and prohibited styles. `docs/TEST-PLAN.md` contains functional, manual, mobile, accessibility, offline, content-source and regression checklists. `CONTRIBUTING.md` documents `feature/xxx`, `fix/xxx`, `chore/xxx`, Traditional Chinese Conventional Commits, source update procedure and mandatory tests.

- [ ] **Step 5: Expand executable content validation**

`scripts/validate-content.mjs` imports `benefits`, walks required files and parses `index.html`. It exits nonzero when a benefit lacks an official HTTPS URL, issuer, verification date, status, requirements or exclusions; when a required file is missing; when a local `href` or `src` target does not exist; or when root-relative resource paths appear. Successful output reports the number of benefits, sources and local links checked.

- [ ] **Step 6: Run automated release checks**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run validate`

Expected: exit 0 and counts for validated benefits, sources and links.

Run: `git diff --check`

Expected: exit 0 and no whitespace errors.

- [ ] **Step 7: Run final browser, RWD and accessibility verification**

Run: `npm run serve`

Verify at `http://127.0.0.1:4173`:

- Desktop 1440px, tablet 768px and mobile 375px have no horizontal overflow.
- Browser console has no errors and all local assets return HTTP 200.
- Theme, checklist, custom items, profile and costs persist after reload.
- Benefit filtering, second-child defaults, source links and no-results recovery work.
- Keyboard-only traversal reaches every control with visible focus.
- Heading hierarchy, labels, status text and 200% zoom remain usable.
- Reduced-motion mode disables nonessential animation.
- Live and fallback open-data paths are both understandable.
- Medical and government-review disclaimers remain visible near relevant results.

- [ ] **Step 8: Commit release documentation and metadata**

```bash
git add 404.html robots.txt sitemap.xml site.webmanifest README.md CONTRIBUTING.md docs/PLAN.md docs/ART-DIRECTION.md docs/TEST-PLAN.md tests/static-site.test.mjs index.html scripts/validate-content.mjs package.json assets/icons
git commit -m "docs: 完成網站文件與靜態部署設定"
```

- [ ] **Step 9: Request code review and address findings**

Determine the review range from the planning commit through `HEAD`, dispatch the required read-only code reviewer with the approved spec and this plan, fix every Critical and Important issue, then rerun `npm test`, `npm run validate`, `git diff --check` and browser smoke checks before making any completion claim.

- [ ] **Step 10: Finish the development branch without pushing**

Invoke `superpowers:finishing-a-development-branch`, freshly rerun the full test suite, detect the Git/worktree environment and present the required integration options. If the user later selects push/PR, first display:

```text
Remote: origin -> https://github.com/andychung0214/libra-family-compass.git
Branch: feature/initial-site
Commits: 執行 `git log --oneline main..feature/initial-site` 所列的完整待推送提交
```

Do not run `git push` until the user approves that exact remote, branch and commit set.
