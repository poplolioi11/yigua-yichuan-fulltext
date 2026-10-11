// SPDX-License-Identifier: 0BSD
// Maintainer: 一卦 yigua.art / poplolioi11
// Verify public data only; never read private website files or fetch a URL.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filenames = ['yichuan-fulltext.json', 'yichuan-fulltext.txt'];
const statuses = new Set(['ai-image-first-pass-unreviewed', 'image-first-pass-unreviewed',
  'ocr-first-pass-unreviewed', 'vision-ocr-first-pass-unreviewed']);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const sourceFilename = '文淵閣四庫全書_0009冊.djvu';
const sourceUrl = (value) => {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:', '影像來源必須為HTTPS');
  assert.ok(['commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname), '未核定的影像來源');
  return url;
};
function checkImageReferences(value, imageUrl) {
  if (Array.isArray(value)) return value.forEach((entry) => checkImageReferences(entry, imageUrl));
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'sourceImage') assert.equal(entry, imageUrl, '公開包不得留下本機影像路徑');
    else checkImageReferences(entry, imageUrl);
  }
}

export function renderText(dataset) {
  const lines = [dataset.meta.title, `整理：${dataset.meta.preparedBy}`,
    '以下為未獨立覆核的全書初錄；□為疑字。頁、半葉、欄標籤由本站新增，不是古籍正文。',
    '同份JSON保留疑字候選、卦圖、版心、來源網址及處理方法。', ''];
  for (const page of dataset.pages) {
    lines.push(`[掃描頁 ${page.scanPage}｜印頁 ${page.printedPage ?? '未核實'}｜${page.role}｜未覆核]`);
    for (const half of page.halves) {
      lines.push(`[${half.position === 'upper' ? '上' : '下'}半葉]`);
      half.columns.forEach((column, index) => lines.push(`[欄 ${index + 1}]${column ? ` ${column}` : ''}`));
      for (const figure of half.figures ?? []) {
        const labels = figure.labels?.join('／') ?? '';
        lines.push(`[圖記｜欄 ${figure.column ?? '未核實'}] ${figure.name ?? figure.type ?? ''}${labels ? `｜${labels}` : ''}`);
      }
    }
    if (page.paratext?.length) {
      lines.push('[題署、版心及副文本（與作者正文分開）]');
      for (const entry of page.paratext) lines.push(`[${entry.position}]${entry.text ? ` ${entry.text}` : ''}`);
    }
    lines.push(`影像：${page.source.imageUrl}`, '');
  }
  if (lines.at(-1) === '') lines.pop(); // final separator is editorial, not text
  return lines.join('\n') + '\n';
}

export function checkDataset(dataset, text) {
  assert.equal(dataset.meta.status, 'complete-first-pass-unreviewed');
  assert.equal(dataset.meta.independentCollationCompleted, false);
  assert.equal(dataset.meta.githubAccount, 'poplolioi11');
  assert.equal(dataset.meta.attribution, 'yigua.art網站轉譯');
  assert.match(dataset.meta.datasetVersion, /^\d+\.\d+\.\d+$/u);
  assert.equal(dataset.meta.repositoryUrl, 'https://github.com/poplolioi11/yigua-yichuan-fulltext');
  assert.deepEqual(dataset.meta.scope.frontMatterPages, [160, 161]);
  assert.equal(dataset.meta.scope.firstScanPage, 160);
  assert.equal(dataset.meta.scope.lastScanPage, 405);
  assert.equal(dataset.pages.length, 246);
  assert.ok(!JSON.stringify(dataset).includes('/Users/'), '公開資料不可包含電腦使用者路徑');
  let characters = 0;
  let doubts = 0;
  for (const [index, page] of dataset.pages.entries()) {
    const number = 160 + index;
    assert.equal(page.scanPage, number, '頁面遺漏、重複或錯序');
    assert.ok(statuses.has(page.status), '原始OCR或校定狀態不能冒充此初錄');
    assert.notEqual(page.completeFirstPass, false);
    assert.equal((page.gaps ?? []).length, 0, '有整段未錄缺漏');
    assert.ok(nonempty(page.method) && nonempty(page.transcriber) && nonempty(page.role), '缺少method、transcriber或role');
    assert.equal(page.source.originalPageCount, 710);
    assert.match(page.source.sourceImageSha256, /^[a-f0-9]{64}$/u);
    const description = sourceUrl(page.source.descriptionUrl);
    assert.equal(description.hostname, 'commons.wikimedia.org');
    assert.equal(decodeURIComponent(description.pathname), `/wiki/File:${sourceFilename}`, '底本檔案不符');
    const image = sourceUrl(page.source.imageUrl);
    assert.ok(decodeURIComponent(image.pathname).includes(`/${sourceFilename}/page${number}-`), '來源頁序或底本檔案不符');
    checkImageReferences(page, page.source.imageUrl);
    assert.ok(page.paratext === undefined || Array.isArray(page.paratext), '副文本必須為陣列，避免TXT遺漏');
    assert.deepEqual(page.halves.map((half) => half.position), ['upper', 'lower']);
    assert.ok(Array.isArray(page.uncertainties));
    const markers = new Set();
    for (const doubt of page.uncertainties) {
      const half = page.halves.find((entry) => entry.position === doubt.half);
      const offset = doubt.positionInColumn ?? doubt.position;
      const marker = doubt.placeholder ?? doubt.marker;
      assert.ok(half && Number.isInteger(doubt.column) && doubt.column > 0);
      assert.ok(Number.isInteger(offset) && offset > 0 && nonempty(marker));
      assert.ok(nonempty(doubt.note ?? doubt.reason));
      const chars = Array.from(half.columns[doubt.column - 1] ?? '');
      assert.equal(chars.slice(offset - 1, offset - 1 + Array.from(marker).length).join(''), marker);
      markers.add(`${doubt.half}:${doubt.column}:${offset}`);
      doubts += 1;
    }
    for (const half of page.halves) {
      assert.ok(Array.isArray(half.columns) && half.columns.length > 0);
      assert.equal(half.columns.length, number === 160 && half.position === 'upper' ? 8 : 16, '物理欄數不完整');
      for (const [columnIndex, column] of half.columns.entries()) {
        assert.equal(typeof column, 'string');
        assert.ok(!column.includes('\uFFFD'), '未處理的替代字元');
        for (const [positionIndex, char] of Array.from(column).entries()) {
          characters += 1;
          if (char === '□') assert.ok(markers.has(`${half.position}:${columnIndex + 1}:${positionIndex + 1}`), '未記錄的疑字');
        }
      }
      if (!half.columns.join('').trim()) {
        assert.equal(half.blankEvidence?.verifiedFromImage, true, '沒有原圖依據的空半葉');
        assert.ok(nonempty(half.blankEvidence?.reason));
        if (half.blankEvidence.reasonCode === 'paratext-only-on-source') {
          assert.equal(half.contentType, 'title-page-paratext-only');
          assert.ok(page.paratext?.some((entry) => entry.position.startsWith(`${half.position}-`)
            && !entry.position.includes('centrefold') && nonempty(entry.text)), '題簽半葉的副文本遺漏');
        } else assert.equal(half.blankEvidence.reasonCode, 'blank-on-source');
      }
    }
  }
  assert.equal(text, renderText(dataset), 'TXT與JSON不是同一份內容');
  return { pages: dataset.pages.length, columnCharacters: characters, recordedDoubts: doubts };
}

export async function verifyExport(directory) {
  const sums = (await readFile(path.join(directory, 'SHA256SUMS'), 'utf8')).trim().split(/\r?\n/u);
  assert.equal(sums.length, filenames.length);
  const expected = new Map();
  for (const row of sums) {
    const match = /^([a-f0-9]{64}) {2}([a-z.-]+)$/u.exec(row);
    assert.ok(match && filenames.includes(match[2]) && !expected.has(match[2]), '校驗值檔不合法');
    expected.set(match[2], match[1]);
  }
  const files = new Map();
  for (const name of filenames) {
    const bytes = await readFile(path.join(directory, name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.get(name), `${name}校驗值不符`);
    files.set(name, new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }
  return { status: 'passed', ...checkDataset(JSON.parse(files.get(filenames[0])), files.get(filenames[1])),
    checksumFiles: expected.size,
    limitations: ['未下載或重新驗證遠端影像；逐頁影像SHA是取得時的紀錄。',
      '此檢查只驗結構與檔案一致性，不驗讀字準確率，也不是密碼簽章。'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'exports');
  await verifyExport(directory).then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
