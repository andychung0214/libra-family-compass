import test from 'node:test';
import assert from 'node:assert/strict';
import { benefits } from '../js/data/benefits.js';

const requiredIds = [
  'prenatal-checkups',
  'taipei-good-pregnancy-2u',
  'national-birth-benefit-2026',
  'taipei-birth-award',
  'under-2-parenting-allowance',
  'public-childcare-subsidy',
  'quasi-public-childcare-subsidy',
  'taipei-friendly-childcare',
  'age-2-to-5-parenting-allowance',
  'age-5-schooling-subsidy',
  'preschool-tax-deduction',
  'rental-subsidy-family',
  'family-parking-permit',
];

test('補助目錄包含核准的一般家庭方案', () => {
  for (const id of requiredIds) {
    assert.ok(benefits.some((benefit) => benefit.id === id), id);
  }
});

test('每筆補助都有可稽核的官方資料', () => {
  for (const benefit of benefits) {
    assert.ok(benefit.title, benefit.id);
    assert.ok(benefit.summary, benefit.id);
    assert.ok(benefit.source.issuer, benefit.id);
    assert.match(benefit.source.url, /^https:\/\//, benefit.id);
    assert.match(benefit.source.verifiedAt, /^2026-09-0[23]$/, benefit.id);
    assert.match(benefit.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/, benefit.id);
    assert.ok(
      ['current', 'scheduled', 'conditional'].includes(benefit.status),
      benefit.id,
    );
    assert.ok(Array.isArray(benefit.requirements), benefit.id);
    assert.ok(Array.isArray(benefit.exclusions), benefit.id);
    assert.ok(Array.isArray(benefit.application.channels), benefit.id);
    assert.ok(Array.isArray(benefit.application.documents), benefit.id);
  }
});

test('第二名子女的核心金額符合官方資料', () => {
  const parenting = benefits.find(
    ({ id }) => id === 'under-2-parenting-allowance',
  );
  const award = benefits.find(({ id }) => id === 'taipei-birth-award');
  const quasiPublic = benefits.find(
    ({ id }) => id === 'quasi-public-childcare-subsidy',
  );

  assert.equal(parenting.amount.tiers[2], 6000);
  assert.equal(award.amount.tiers[2], 45000);
  assert.equal(quasiPublic.amount.tiers[2], 14000);
});
