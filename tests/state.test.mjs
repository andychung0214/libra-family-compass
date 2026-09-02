import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPersistedState, createState } from '../js/state.js';

test('更新不可變狀態、通知訂閱者並保存', () => {
  const saved = [];
  const store = createState(
    { theme: 'wine-red', checklist: { completed: [] } },
    { save: (key, value) => saved.push([key, value]) },
  );
  let observed;
  store.subscribe((state) => {
    observed = state;
  });

  store.update({ theme: 'london-blue' });

  assert.equal(observed.theme, 'london-blue');
  assert.deepEqual(saved.at(-1), ['state', observed]);
});

test('取得的狀態副本不會改動內部資料', () => {
  const store = createState(
    { theme: 'wine-red', checklist: { completed: [] } },
    { save() {} },
  );
  const copy = store.getState();
  copy.checklist.completed.push('changed-outside');

  assert.deepEqual(store.getState().checklist.completed, []);
});

test('重設狀態會通知並保存初始值', () => {
  const saved = [];
  const store = createState(
    { theme: 'wine-red' },
    { save: (key, value) => saved.push([key, value]) },
  );
  store.update({ theme: 'london-blue' });
  store.reset();

  assert.equal(store.getState().theme, 'wine-red');
  assert.equal(saved.at(-1)[1].theme, 'wine-red');
});

test('清除本站資料後不會把預設狀態重新留在儲存空間', () => {
  const calls = [];
  const store = createState(
    { theme: 'london-blue' },
    { save: () => calls.push('save') },
  );
  const persistence = { removeAll: () => calls.push('remove') };

  clearPersistedState(store, persistence, { theme: 'wine-red' });

  assert.deepEqual(calls, ['save', 'remove']);
  assert.equal(store.getState().theme, 'wine-red');
});
