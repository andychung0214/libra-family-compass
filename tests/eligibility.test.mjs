import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBenefit,
  filterBenefits,
  formatBenefitAmount,
} from '../js/eligibility.js';

const benefit = {
  jurisdiction: 'taipei',
  stages: ['under-2'],
  childOrders: [2, 3],
  careModes: ['home'],
  effectiveFrom: '2026-01-01',
  requirements: ['設籍臺北市'],
  exclusions: ['不可同領托育補助'],
  amount: { kind: 'monthly', value: 6000, unit: 'TWD' },
};

test('第二名子女居家照顧情境顯示初步符合', () => {
  const result = evaluateBenefit(
    benefit,
    {
      region: 'taipei',
      childOrder: 2,
      childStage: 'under-2',
      careMode: 'home',
      householdTags: [],
    },
    '2026-09-03',
  );

  assert.equal(result.status, 'likely');
});

test('托育方式互斥時說明不符合原因', () => {
  const result = evaluateBenefit(
    benefit,
    {
      region: 'taipei',
      childOrder: 2,
      childStage: 'under-2',
      careMode: 'quasi-public',
      householdTags: [],
    },
    '2026-09-03',
  );

  assert.equal(result.status, 'not-match');
  assert.ok(result.reasons.some((reason) => reason.includes('照顧方式')));
});

test('設定不足時標示需要確認', () => {
  const result = evaluateBenefit(
    benefit,
    { region: 'taipei' },
    '2026-09-03',
  );

  assert.equal(result.status, 'check');
});

test('政策尚未生效時標示需要確認', () => {
  const result = evaluateBenefit(
    benefit,
    {
      region: 'taipei',
      childOrder: 2,
      childStage: 'under-2',
      careMode: 'home',
    },
    '2025-12-31',
  );

  assert.equal(result.status, 'check');
  assert.ok(result.reasons.some((reason) => reason.includes('尚未生效')));
});

test('格式化每月新臺幣金額', () => {
  assert.equal(formatBenefitAmount(benefit.amount), '每月 NT$6,000');
});

test('格式化依子女排序的金額', () => {
  assert.equal(
    formatBenefitAmount(
      { kind: 'tiered', tiers: { 1: 40000, 2: 45000, 3: 50000 }, unit: 'TWD' },
      2,
    ),
    '一次 NT$45,000',
  );
});

test('依階段與文字篩選且不改動原資料', () => {
  const source = [
    {
      id: 'a',
      title: '生育獎勵金',
      summary: '臺北市家庭',
      stages: ['birth'],
      tags: ['臺北市'],
      jurisdiction: 'taipei',
    },
  ];

  assert.equal(
    filterBenefits(source, { stage: 'birth', query: '獎勵' }).length,
    1,
  );
  assert.equal(source.length, 1);
});
