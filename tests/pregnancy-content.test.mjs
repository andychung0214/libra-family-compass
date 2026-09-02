import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pregnancyMilestones,
  pregnancySources,
  urgentSigns,
} from '../js/data/pregnancy-guide.js';

test('孕期資料包含後期必要節點', () => {
  assert.ok(
    pregnancyMilestones.some(
      ({ id, startWeek }) => id === 'third-ultrasound' && startWeek === 32,
    ),
  );
  assert.ok(
    pregnancyMilestones.some(
      ({ id, startWeek, endWeek }) =>
        id === 'gbs-screening' && startWeek === 35 && endWeek === 37,
    ),
  );
  assert.ok(urgentSigns.some(({ id }) => id === 'water-breaking'));
  assert.ok(urgentSigns.some(({ id }) => id === 'vaginal-bleeding'));
});

test('孕期來源均為具查核日期的官方 HTTPS 頁面', () => {
  assert.ok(pregnancySources.length >= 2);
  for (const source of pregnancySources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.verifiedAt, /^2026-09-0[23]$/);
    assert.ok(source.issuer.includes('衛生福利部'));
  }
});
