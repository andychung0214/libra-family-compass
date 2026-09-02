import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOpenData, parseFacilityCsv } from '../js/open-data.js';

test('回傳經驗證的即時 JSON 資料列', async () => {
  const result = await loadOpenData({
    fetchFn: async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ result: { results: [{ name: '測試托嬰中心' }] } }),
    }),
    url: 'https://data.taipei/example',
    fallback: [],
    timeoutMs: 50,
  });
  assert.equal(result.mode, 'live');
  assert.equal(result.rows[0].name, '測試托嬰中心');
});

test('解析臺北市公開 CSV 欄位', () => {
  const rows = parseFacilityCsv('機構類型,機構名稱,收托人數,地址,電話\n公辦民營托嬰中心,臺北市測試托嬰中心,40,臺北市測試區一號,(02)12345678');
  assert.deepEqual(rows, [{
    type: '公辦民營托嬰中心',
    name: '臺北市測試托嬰中心',
    capacity: 40,
    address: '臺北市測試區一號',
    phone: '(02)12345678',
  }]);
});

test('網路、格式錯誤或未設定端點時回傳備援資料', async () => {
  const fallback = [{ name: '本機備援', verifiedAt: '2026-09-03' }];
  const failed = await loadOpenData({
    fetchFn: async () => { throw new Error('offline'); },
    url: 'https://data.taipei/example',
    fallback,
    timeoutMs: 50,
  });
  const disabled = await loadOpenData({ fetchFn: async () => {}, url: '', fallback });

  assert.equal(failed.mode, 'fallback');
  assert.deepEqual(failed.rows, fallback);
  assert.match(failed.message, /備援資料/);
  assert.equal(disabled.mode, 'fallback');
  assert.match(disabled.message, /跨來源限制/);
});
