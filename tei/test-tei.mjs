// SPDX-License-Identifier: 0BSD
// Maintainer: 一卦 yigua.art / poplolioi11
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTEI, sha256, offsetOf, normalizeDoi, defaultSourcePath } from './convert-tei.mjs';
import { verifyTEI, validateWithXmllint } from './verify-tei.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = process.argv[2] ? path.resolve(process.argv[2])
  : await defaultSourcePath(directory);
const xmlPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(directory, 'yichuan-fulltext.tei.xml');
const schemaPath = process.argv[4] ? path.resolve(process.argv[4]) : path.resolve(directory, '../schema/tei_all.rng');
const raw = await readFile(sourcePath, 'utf8');
const xml = await readFile(xmlPath, 'utf8');
const tests = [];
const test = (name, fn) => { fn(); tests.push(name); };
const mutate = (pattern, replacement) => {
  const changed = xml.replace(pattern, replacement);
  assert.notEqual(changed, xml, '負向測試未改到目標');
  return changed;
};
const doi = /<idno type="DOI">([^<]+)<\/idno>/u.exec(xml)?.[1] ?? null;

const validation = await validateWithXmllint(xmlPath, schemaPath);
const result = verifyTEI(xml, raw);
test('固定語料逐字回復及完整 JSON 快照', () => {
  assert.equal(result.pages, 246);
  assert.equal(result.halves, 492);
  assert.equal(result.columns, 7864);
  assert.equal(result.emptyColumns, 187);
  assert.equal(result.columnCodepoints, 130438);
  assert.equal(result.uncertainties, 90);
  assert.equal(result.figures, 65);
  assert.equal(result.paratext, 775);
});
test('相同來源與 DOI 產生完全相同 XML bytes', () => assert.equal(renderTEI(raw, { doi }), xml));
test('改動一字會拒絕', () => assert.throws(() => verifyTEI(mutate('>欽定四庫全書</ab>', '>欽定四庫全書甲</ab>'), raw)));
test('刪除空欄會拒絕', () => assert.throws(() => verifyTEI(mutate(/\s*<ab xml:id="yc-p160-lower-c06"[^>]*><\/ab>/u, ''), raw)));
test('交換右至左欄序會拒絕', () => {
  const changed = mutate(/(<ab xml:id="yc-p160-upper-c01"[^>]*>[\s\S]*?<\/ab>)(\s*)(<ab xml:id="yc-p160-upper-c02"[^>]*>[\s\S]*?<\/ab>)/u, '$3$2$1');
  assert.throws(() => verifyTEI(changed, raw));
});
test('改動疑字候選會拒絕', () => assert.throws(() => verifyTEI(mutate(/(<seg type="candidate-readings-json">)[^<]*(<\/seg>)/u, '$1[&quot;假讀&quot;]$2'), raw)));
test('移動疑字碼點位置會拒絕', () => assert.throws(() => verifyTEI(mutate(/(<num type="unicode-codepoint-start" value=")\d+("[^>]*>)/u, '$1999$2'), raw)));
test('來源頁影像連結改動會拒絕', () => assert.throws(() => verifyTEI(mutate('page160-1920px-', 'page161-1920px-'), raw)));
test('未解決影像參照會拒絕', () => assert.throws(() => verifyTEI(mutate('facs="#yc-s160"', 'facs="#yc-s999"'), raw)));
test('重複 xml:id 會拒絕', () => assert.throws(() => verifyTEI(mutate('xml:id="yc-p160-lower-c06"', 'xml:id="yc-p160-lower-c05"'), raw)));
test('原始快照內容改動會拒絕', () => assert.throws(() => verifyTEI(mutate('&quot;preparedBy&quot;: &quot;一卦 yigua.art / poplolioi11&quot;', '&quot;preparedBy&quot;: &quot;其他整理者&quot;'), raw)));
test('不接受 DTD 或外部 entity', () => assert.throws(() => verifyTEI(xml.replace('<TEI ', '<!DOCTYPE TEI [<!ENTITY x SYSTEM "file:///private">]><TEI '), raw)));
test('非 BMP、XML 保留字元及空白以碼點無損回復', () => {
  const fixture = JSON.parse(raw);
  const half = fixture.pages[0].halves[1];
  const prefix = '𠀀&<>"\'\t\n\r';
  half.columns[1] = prefix + half.columns[1];
  for (const u of fixture.pages[0].uncertainties.filter((u) => u.half === 'lower' && u.column === 2)) {
    if (Object.hasOwn(u, 'positionInColumn')) u.positionInColumn += Array.from(prefix).length;
    else u.position += Array.from(prefix).length;
  }
  const synthetic = JSON.stringify(fixture, null, 2) + '\n';
  const encoded = renderTEI(synthetic);
  const verified = verifyTEI(encoded, synthetic, { expectedSourceSha: sha256(synthetic) });
  assert.equal(verified.columnCodepoints, 130438 + Array.from(prefix).length);
  const physical = spawnSync('xmllint', ['--nonet', '--noout', '--relaxng', schemaPath, '-'], { input: encoded, encoding: 'utf8', maxBuffer: 1048576 });
  assert.equal(physical.status, 0, physical.stderr);
  assert.equal(offsetOf(fixture.pages[0].uncertainties[0]), 18 + Array.from(prefix).length);
});
test('只有語法有效的 DOI 可進入 header', () => {
  assert.equal(normalizeDoi('https://doi.org/10.5281/zenodo.12345678'), '10.5281/zenodo.12345678');
  assert.throws(() => normalizeDoi('not-a-doi'));
  const withDoi = renderTEI(raw, { doi: '10.5281/zenodo.12345678' });
  assert.ok(withDoi.includes('<idno type="DOI">10.5281/zenodo.12345678</idno>'));
  verifyTEI(withDoi, raw);
});

console.log(JSON.stringify({ status: 'passed', tests: tests.length, names: tests,
  ...validation, result, fixtureNote: '非 BMP 與保留字元僅在記憶體測試夾具；未寫入正式語料。DOI 測試號碼僅在記憶體夾具，不是實際 DOI。' }, null, 2));
