import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hospitalBagItems } from '../js/data/hospital-bag.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('頁面包含語意地標與所有核准區段', () => {
  assert.match(html, /<html lang="zh-Hant"/);
  assert.match(html, /<a class="skip-link" href="#main-content">/);
  assert.match(html, /<main id="main-content"/);
  for (const id of [
    'today',
    'pregnancy',
    'benefits',
    'hospital-bag',
    'costs',
    'sources',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('頁面提供可存取控制項與 ES Module 入口', () => {
  assert.match(html, /id="theme-toggle"[^>]*aria-label=/);
  assert.match(html, /id="benefit-query"/);
  assert.match(html, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});

test('表單錯誤與欄位建立無障礙關聯', () => {
  assert.match(html, /id="due-date"[^>]+aria-describedby="due-date-help due-date-error"/);
  assert.match(html, /id="due-date-error" role="alert"/);
  assert.match(html, /id="cost-title"[^>]+aria-describedby="cost-form-error"/);
  assert.match(html, /id="cost-expense"[^>]+aria-describedby="cost-form-error"/);
  assert.match(html, /id="cost-form-error" role="alert"/);
});

test('待產包具有六種家庭情境分類與唯一識別', () => {
  const categories = new Set(hospitalBagItems.map(({ category }) => category));
  assert.deepEqual(
    [...categories].sort(),
    ['baby', 'documents', 'home', 'mom', 'older-child', 'partner'].sort(),
  );
  assert.equal(new Set(hospitalBagItems.map(({ id }) => id)).size, hospitalBagItems.length);
  assert.ok(hospitalBagItems.length >= 24);
});
