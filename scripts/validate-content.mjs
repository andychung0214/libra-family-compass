import { access, readFile } from 'node:fs/promises';
import { benefits } from '../js/data/benefits.js';

const requiredFiles = [
  'package.json',
  'LICENSE',
  '.gitignore',
  'README.md',
  'CONTRIBUTING.md',
  'index.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'docs/PLAN.md',
  'docs/ART-DIRECTION.md',
  'docs/TEST-PLAN.md',
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

const validStatuses = new Set(['current', 'conditional', 'upcoming']);
for (const benefit of benefits) {
  if (!benefit.id || !benefit.title || !benefit.summary) {
    throw new Error('補助缺少識別、名稱或摘要');
  }
  if (!benefit.source?.issuer || !benefit.source?.verifiedAt) {
    throw new Error(`${benefit.id} 缺少主管機關或查核日期`);
  }
  if (!/^https:\/\//.test(benefit.source.url)) {
    throw new Error(`${benefit.id} 的官方來源不是 HTTPS`);
  }
  if (!validStatuses.has(benefit.status)) {
    throw new Error(`${benefit.id} 的狀態不在允許清單`);
  }
  if (!benefit.requirements?.length || !benefit.exclusions?.length) {
    throw new Error(`${benefit.id} 缺少資格或排除條件`);
  }
}

const indexUrl = new URL('../index.html', import.meta.url);
const html = await readFile(indexUrl, 'utf8');
if (/(?:href|src)="\/(?!\/)/.test(html)) {
  throw new Error('首頁含有不相容 GitHub Pages 子路徑的根目錄資源');
}

const localTargets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((target) => !/^(?:https?:|mailto:|tel:|#|data:)/.test(target));

for (const target of localTargets) {
  const cleanTarget = target.split(/[?#]/, 1)[0];
  await access(new URL(cleanTarget, indexUrl));
}

const sourceCount = new Set(benefits.map((benefit) => benefit.source.url)).size;
console.log(
  `內容驗證完成：${benefits.length} 項補助、${sourceCount} 個官方來源、${localTargets.length} 個首頁本機連結、${requiredFiles.length} 個必要檔案`,
);
