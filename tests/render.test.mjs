import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checklistProgress,
  formatMoney,
  makeTextModel,
  nextTheme,
} from '../js/render.js';

test('使用者輸入保持為文字而不是標記', () => {
  assert.deepEqual(makeTextModel('<img src=x onerror=alert(1)>'), {
    text: '<img src=x onerror=alert(1)>',
  });
});

test('花費金額明確標示為新臺幣', () => {
  assert.equal(formatMoney(20000), 'NT$20,000');
});

test('清單進度處理空清單與部分完成', () => {
  assert.deepEqual(checklistProgress([], new Set()), {
    complete: 0,
    total: 0,
    percent: 0,
  });
  assert.deepEqual(
    checklistProgress([{ id: 'a' }, { id: 'b' }], new Set(['a'])),
    { complete: 1, total: 2, percent: 50 },
  );
});

test('主題只在核准的兩個值之間切換', () => {
  assert.equal(nextTheme('wine-red'), 'london-blue');
  assert.equal(nextTheme('london-blue'), 'wine-red');
  assert.equal(nextTheme('unknown'), 'wine-red');
});
