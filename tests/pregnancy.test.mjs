import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePregnancyProgress,
  getUpcomingMilestones,
} from '../js/pregnancy.js';

test('在 2026-09-02 保留核准的第 32 週基準', () => {
  const result = calculatePregnancyProgress(
    {
      referenceDate: '2026-09-02',
      pregnancyWeek: 32,
      pregnancyDay: 0,
      dueDate: null,
    },
    new Date('2026-09-02T12:00:00+08:00'),
  );

  assert.deepEqual(result, {
    week: 32,
    day: 0,
    mode: 'reference',
    valid: true,
  });
});

test('跨年後仍能正確推進孕週', () => {
  const result = calculatePregnancyProgress(
    {
      referenceDate: '2026-12-30',
      pregnancyWeek: 40,
      pregnancyDay: 0,
      dueDate: null,
    },
    new Date('2027-01-02T12:00:00+08:00'),
  );

  assert.equal(result.week, 40);
  assert.equal(result.day, 3);
});

test('以預產日期提供 40 週估算', () => {
  const result = calculatePregnancyProgress(
    {
      referenceDate: null,
      pregnancyWeek: null,
      pregnancyDay: null,
      dueDate: '2026-10-21',
    },
    new Date('2026-09-02T12:00:00+08:00'),
  );

  assert.equal(result.mode, 'due-date');
  assert.equal(result.valid, true);
  assert.equal(result.week, 33);
  assert.equal(result.day, 0);
});

test('拒絕超出 0 至 42 週的結果', () => {
  const result = calculatePregnancyProgress(
    {
      referenceDate: '2026-01-01',
      pregnancyWeek: 0,
      pregnancyDay: 0,
      dueDate: null,
    },
    new Date('2026-12-31T12:00:00+08:00'),
  );

  assert.equal(result.valid, false);
  assert.equal(result.week, null);
  assert.equal(result.day, null);
});

test('無效日期不會產生錯誤孕週', () => {
  const result = calculatePregnancyProgress(
    {
      referenceDate: '2026-02-30',
      pregnancyWeek: 32,
      pregnancyDay: 0,
      dueDate: null,
    },
    new Date('2026-09-02T12:00:00+08:00'),
  );

  assert.equal(result.valid, false);
});

test('依週次回傳最近里程碑', () => {
  const result = getUpcomingMilestones(
    { week: 32, day: 0, valid: true },
    [
      { id: 'gbs', startWeek: 35 },
      { id: 'ultrasound', startWeek: 32 },
      { id: 'past', startWeek: 28, endWeek: 28 },
    ],
    2,
  );

  assert.deepEqual(result.map(({ id }) => id), ['ultrasound', 'gbs']);
});
