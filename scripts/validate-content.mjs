import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'package.json',
  'LICENSE',
  '.gitignore',
  'docs/superpowers/specs/2026-09-02-libra-family-compass-design.md',
  'docs/superpowers/plans/2026-09-03-libra-family-compass-implementation.md',
];

await Promise.all(
  requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))),
);

const pkg = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);

if (pkg.name !== 'libra-family-compass' || pkg.type !== 'module') {
  throw new Error('package.json 專案識別或模組設定不正確');
}

console.log(`基礎內容驗證完成：${requiredFiles.length} 個必要檔案`);
