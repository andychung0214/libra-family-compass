import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('往返讀寫有版本前綴的資料', () => {
  const storage = createStorage(memoryStorage());
  assert.equal(storage.save('theme', 'london-blue'), true);
  assert.equal(storage.load('theme', 'wine-red'), 'london-blue');
});

test('JSON 損壞時回傳安全預設值並通知', () => {
  const errors = [];
  const storage = createStorage(
    memoryStorage({ 'libraFamilyCompass:v1:theme': '{bad' }),
    (message) => errors.push(message),
  );

  assert.equal(storage.load('theme', 'wine-red'), 'wine-red');
  assert.equal(errors.length, 1);
});

test('清除時只刪除本站前綴', () => {
  const raw = memoryStorage({
    'libraFamilyCompass:v1:theme': '"wine-red"',
    'libraFamilyCompass:v1:state': '{}',
    'another-site:key': 'keep',
  });

  createStorage(raw).removeAll();

  assert.equal(raw.getItem('libraFamilyCompass:v1:theme'), null);
  assert.equal(raw.getItem('another-site:key'), 'keep');
});

test('儲存不可用時不會讓網站中斷', () => {
  const errors = [];
  const storage = createStorage(
    {
      get length() { return 0; },
      key() { return null; },
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    },
    (message) => errors.push(message),
  );

  assert.equal(storage.load('theme', 'wine-red'), 'wine-red');
  assert.equal(storage.save('theme', 'wine-red'), false);
  assert.ok(errors.length >= 2);
});
