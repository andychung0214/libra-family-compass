import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('專案指令只使用 Node.js 內建工具', async () => {
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal(pkg.scripts.validate, 'node scripts/validate-content.mjs');
  assert.equal(pkg.scripts.serve, 'node scripts/serve.mjs');
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.deepEqual(pkg.devDependencies ?? {}, {});
});
