import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.gitignore',
  'index.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'docs/PLAN.md',
  'docs/ART-DIRECTION.md',
  'docs/TEST-PLAN.md',
];

test('所有必要交付檔案均存在', async () => {
  await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));
});

test('首頁包含 SEO 與結構化資料且不使用根目錄資源路徑', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /property="og:title"/);
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /rel="manifest" href="\.\/site\.webmanifest"/);
  assert.match(html, /rel="canonical" href="https:\/\/andychung0214\.github\.io\/libra-family-compass\/"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});

test('README 包含要求的操作與維護章節', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const heading of [
    '遊戲介紹',
    '特色',
    '操作方式',
    '安裝與執行',
    '專案結構',
    '測試方式',
    '靜態網站',
    '已知限制',
    '授權',
  ]) {
    assert.match(readme, new RegExp(`## ${heading}`));
  }
});

test('本機伺服器為 robots.txt 提供純文字類型', async () => {
  const server = await readFile(new URL('../scripts/serve.mjs', import.meta.url), 'utf8');
  assert.match(server, /\['\.txt', 'text\/plain; charset=utf-8'\]/);
});
