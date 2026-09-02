import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseMoney, summariseCosts } from '../js/costs.js';

test('無效、空白與負數金額會轉為零', () => {
  assert.equal(normaliseMoney('abc'), 0);
  assert.equal(normaliseMoney(''), 0);
  assert.equal(normaliseMoney(-500), 0);
  assert.equal(normaliseMoney('1,250'), 1250);
});

test('彙整每月與一次性支出及補助', () => {
  const result = summariseCosts([
    { cadence: 'monthly', expense: 10000, subsidy: 6000 },
    { cadence: 'once', expense: 24000, subsidy: 45000 },
  ]);

  assert.deepEqual(result, {
    monthlyExpense: 10000,
    monthlySubsidy: 6000,
    annualExpense: 144000,
    annualSubsidy: 117000,
    annualNet: 27000,
  });
});

test('補助高於支出時淨支出不會變成負數', () => {
  assert.equal(
    summariseCosts([{ cadence: 'once', expense: 1000, subsidy: 5000 }]).annualNet,
    0,
  );
});
