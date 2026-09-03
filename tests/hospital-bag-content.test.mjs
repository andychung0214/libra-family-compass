import test from 'node:test';
import assert from 'node:assert/strict';
import * as hospitalBag from '../js/data/hospital-bag.js';

const { hospitalBagItems } = hospitalBag;
const byId = new Map(hospitalBagItems.map((item) => [item.id, item]));

test('產後衛生用品可逐件勾選而不是合併成一項', () => {
  const expectedIds = [
    'maternity-pads',
    'underpads',
    'peri-bottle',
    'postpartum-tissues',
    'sitz-bath',
  ];

  for (const id of expectedIds) {
    assert.ok(byId.has(id), `缺少獨立待產項目：${id}`);
    assert.equal(byId.get(id).category, 'mom');
  }
  assert.ok(!hospitalBagItems.some(({ title }) => title === '產墊與產婦衛生用品'));
});

test('容易漏帶的組合用品皆拆成獨立核取項目', () => {
  const expectedIds = [
    'mom-clothes',
    'mom-discharge-clothes',
    'nursing-bra',
    'breast-pads',
    'toiletries',
    'mom-towel',
    'personal-care',
    'slippers',
    'warm-socks',
    'baby-clothes',
    'baby-outer-clothes',
    'baby-hat-socks',
    'baby-socks',
    'newborn-diapers',
    'baby-wipes',
    'feeding-cloths',
    'partner-meals',
    'partner-snacks',
    'older-child-bag',
    'older-child-toiletries',
    'older-child-medication-notes',
    'older-child-comfort-item',
  ];

  for (const id of expectedIds) {
    assert.ok(byId.has(id), `缺少獨立待產項目：${id}`);
  }
  assert.ok(hospitalBagItems.length >= 48);
  assert.equal(new Set(hospitalBagItems.map(({ title }) => title)).size, hospitalBagItems.length);
});

test('待產包細項附有多筆臺灣官方醫療來源', () => {
  assert.ok(Array.isArray(hospitalBag.hospitalBagSources));
  assert.ok(hospitalBag.hospitalBagSources.length >= 3);
  for (const source of hospitalBag.hospitalBagSources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.verifiedAt, /^2026-09-03$/);
  }
});
