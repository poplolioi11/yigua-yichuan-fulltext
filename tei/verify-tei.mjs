// SPDX-License-Identifier: 0BSD
// Maintainer: 一卦 yigua.art / poplolioi11
// No network access. Native XML parsing/Relax NG validation uses xmllint.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEI_NS, JSON_NS, TEI_VERSION, ENCODING_VERSION, SCHEMA_URL,
  FROZEN_SOURCE_SHA256, sha256, columnId, doubtId, recordId, offsetOf,
  markerOf, reasonOf, candidatesOf } from './convert-tei.mjs';

const SCHEMA_SHA256 = 'b0f115095ead2ccc6933aa3365c6f4a82cba3b2ec7eee7f76bb616d7a63b7e48';

function decodeXml(text) {
  const predefined = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&([^;\s]+);/gu, (whole, name) => {
    if (Object.hasOwn(predefined, name)) return predefined[name];
    if (/^#x[0-9a-f]+$/iu.test(name)) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (/^#\d+$/u.test(name)) return String.fromCodePoint(Number(name.slice(1)));
    throw new Error(`非預定義 XML entity：${whole}`);
  });
}

// This deliberately narrow tree reader handles the generated XML vocabulary.
// CLI checks XML 1.0 and namespaces with libxml2 before this structural audit.
export function parseGeneratedXML(xml) {
  assert.ok(!/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/iu.test(xml), '檢查器不接受 DTD、外部 entity 或 CDATA');
  const normalized = xml.replace(/\r\n?/gu, '\n');
  const root = { name: '#document', local: '#document', ns: '', attrs: {}, children: [], namespaces: { xml: 'http://www.w3.org/XML/1998/namespace' } };
  const stack = [root];
  const tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/gu;
  let end = 0;
  for (const match of normalized.matchAll(tokens)) {
    assert.equal(match.index, end, '無法完整解析 XML');
    const token = match[0];
    end = match.index + token.length;
    if (token.startsWith('<?') || token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      const name = token.slice(2, -1).trim();
      assert.equal(stack.at(-1).name, name, '結束標籤不符');
      stack.pop();
      continue;
    }
    if (token.startsWith('<')) {
      const opening = /^<([A-Za-z_][\w.:-]*)([\s\S]*?)(\/?)>$/u.exec(token);
      assert.ok(opening, '無法解析 XML 開始標籤');
      const [, name, attributeText, selfClosing] = opening;
      const attrs = {};
      const attributePattern = /\s+([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;
      const remainder = attributeText.replace(attributePattern, (all, key, double, single) => {
        assert.ok(!Object.hasOwn(attrs, key), '重複 attribute');
        // XML literal attribute whitespace is normalized; character references are not.
        attrs[key] = decodeXml((double ?? single).replace(/[\t\n\r]/gu, ' '));
        return '';
      });
      assert.equal(remainder.trim(), '', '未解析 attribute');
      const parent = stack.at(-1);
      const namespaces = { ...parent.namespaces };
      for (const [key, value] of Object.entries(attrs)) {
        if (key === 'xmlns') namespaces[''] = value;
        else if (key.startsWith('xmlns:')) namespaces[key.slice(6)] = value;
      }
      const [prefix, local] = name.includes(':') ? name.split(':') : ['', name];
      assert.ok(prefix === '' || Object.hasOwn(namespaces, prefix), '未宣告 namespace prefix');
      const node = { name, local, ns: namespaces[prefix] ?? '', attrs, children: [], namespaces, parent };
      parent.children.push(node);
      if (!selfClosing) stack.push(node);
    } else stack.at(-1).children.push(decodeXml(token));
  }
  assert.equal(end, normalized.length, 'XML 未讀完');
  assert.equal(stack.length, 1, 'XML 未封閉');
  const elements = root.children.filter((item) => typeof item !== 'string');
  assert.equal(elements.length, 1, 'XML 必須只有一個根元素');
  assert.ok(root.children.filter((item) => typeof item === 'string').every((text) => !text.trim()), '根元素外文字');
  return elements[0];
}

const elementChildren = (node) => node.children.filter((item) => typeof item !== 'string');
const textContent = (node) => node.children.map((item) => typeof item === 'string' ? item : textContent(item)).join('');
const children = (node, name, type) => elementChildren(node).filter((item) => item.ns === TEI_NS && item.local === name && (type === undefined || item.attrs.type === type));
const one = (node, name, type) => {
  const found = children(node, name, type);
  assert.equal(found.length, 1, `${name}/${type ?? ''} 必須恰有一項`);
  return found[0];
};
const walk = (node) => [node, ...elementChildren(node).flatMap(walk)];
const field = (node, type) => {
  const found = elementChildren(node).filter((child) => child.attrs.type === type);
  assert.equal(found.length, 1, `缺少或重複 ${type}`);
  return found[0];
};

export function verifyTEI(xml, sourceJSONText = null, { expectedSourceSha = FROZEN_SOURCE_SHA256 } = {}) {
  const root = parseGeneratedXML(xml);
  assert.equal(root.ns, TEI_NS);
  assert.equal(root.local, 'TEI');
  assert.equal(root.attrs.version, TEI_VERSION);
  assert.ok(xml.includes(`<?xml-model href="${SCHEMA_URL}" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>`), '缺少固定版 schema processing instruction');
  const nodes = walk(root);
  const ids = new Map();
  for (const node of nodes) {
    if (node.attrs['xml:id']) {
      assert.ok(!ids.has(node.attrs['xml:id']), '重複 xml:id');
      ids.set(node.attrs['xml:id'], node);
    }
  }
  let localReferences = 0;
  for (const node of nodes) {
    for (const attribute of ['facs', 'corresp', 'target', 'who', 'resp', 'source']) {
      for (const target of (node.attrs[attribute] ?? '').split(/\s+/u).filter(Boolean)) {
        if (target.startsWith('#')) {
          assert.ok(ids.has(target.slice(1)), `未解決內部參照 ${target}`);
          localReferences += 1;
        }
      }
    }
  }
  const foreign = nodes.filter((node) => node.ns !== TEI_NS);
  assert.equal(foreign.length, 1, '非 TEI namespace 僅容納原始 JSON 快照');
  const snapshot = foreign[0];
  assert.equal(snapshot.ns, JSON_NS);
  assert.equal(snapshot.local, 'sourceJSON');
  assert.equal(snapshot.parent.local, 'xenoData');
  assert.equal(snapshot.parent.ns, TEI_NS);
  assert.equal(snapshot.attrs.mediaType, 'application/json');
  const raw = textContent(snapshot);
  assert.equal(sha256(raw), snapshot.attrs.sha256, '內嵌原始 JSON 的 SHA 不符');
  assert.equal(sha256(raw), expectedSourceSha, '內嵌快照不是固定來源');
  if (sourceJSONText !== null) assert.equal(raw, sourceJSONText, '內嵌 JSON 不是原檔完整字串');
  const { meta, pages } = JSON.parse(raw);
  assert.equal(meta.independentCollationCompleted, false);
  assert.equal(meta.status, 'complete-first-pass-unreviewed');
  assert.equal(meta.datasetVersion, snapshot.attrs.corpusVersion);
  assert.deepEqual(meta.scope.frontMatterPages, [160, 161]);
  assert.equal(pages.length, 246);
  const header = one(root, 'teiHeader');
  const fileDesc = one(header, 'fileDesc');
  const edition = one(one(fileDesc, 'editionStmt'), 'edition');
  assert.equal(edition.attrs.n, ENCODING_VERSION);
  const titleStmt = one(fileDesc, 'titleStmt');
  const author = one(titleStmt, 'author');
  assert.equal(textContent(author), meta.historicalAuthor);
  assert.equal(author.attrs.role, 'historical-author-of-preface-and-commentary');
  assert.ok(textContent(one(fileDesc, 'notesStmt')).includes('160') && textContent(one(fileDesc, 'notesStmt')).includes('161'));
  const facsimile = one(root, 'facsimile');
  const surfaces = children(facsimile, 'surface');
  assert.equal(surfaces.length, pages.length);
  assert.equal(nodes.filter((node) => ['zone', 'line', 'lb', 'gap', 'supplied', 'choice', 'corr'].includes(node.local) && node.ns === TEI_NS).length, 0, '沒有可靠來源時不得臆造座標、行界、缺文或定字');
  const body = one(one(root, 'text'), 'body');
  const pageDivs = children(body, 'div', 'scan-page');
  assert.equal(pageDivs.length, pages.length);
  const records = children(one(one(root, 'standOff'), 'listAnnotation', 'uncertainty-records'), 'note', 'uncertainty-record');
  const expectedDoubts = pages.reduce((count, page) => count + page.uncertainties.length, 0);
  assert.equal(records.length, expectedDoubts);
  assert.equal(nodes.filter((node) => node.ns === TEI_NS && node.local === 'unclear').length, expectedDoubts);
  let codepoints = 0, columnCount = 0, emptyColumns = 0, figures = 0, paratext = 0;
  const reconstructed = [];
  for (const [pageIndex, page] of pages.entries()) {
    assert.equal(page.scanPage, 160 + pageIndex, '頁序缺漏或重複');
    assert.ok(page.status.endsWith('first-pass-unreviewed'), '不可將原始 OCR 或定本當作初錄');
    const surface = surfaces[pageIndex];
    assert.equal(surface.attrs['xml:id'], `yc-s${page.scanPage}`);
    assert.equal(surface.attrs.n, String(page.scanPage));
    assert.equal(one(surface, 'graphic').attrs.url, page.source.imageUrl);
    assert.equal(one(surface, 'graphic').attrs.mimeType, 'image/jpeg');
    const pageNode = pageDivs[pageIndex];
    assert.equal(pageNode.attrs['xml:id'], `yc-p${page.scanPage}`);
    assert.equal(pageNode.attrs.n, String(page.scanPage));
    assert.equal(pageNode.attrs.subtype, page.role);
    assert.equal(pageNode.attrs.facs, `#yc-s${page.scanPage}`);
    for (const key of ['status', 'transcriber', 'method']) {
      const type = key === 'status' ? 'transcription-status' : key;
      assert.equal(textContent(field(pageNode, type)), page[key]);
    }
    if (page.scanPage < 162) {
      assert.ok(textContent(field(pageNode, 'authorship')).includes('不歸給程頤'));
      assert.equal(children(pageNode, 'author').length, 0);
    }
    const halfDivs = children(pageNode, 'div', 'half-page');
    assert.equal(halfDivs.length, page.halves.length);
    assert.deepEqual(page.halves.map((half) => half.position), ['upper', 'lower']);
    for (const [halfIndex, half] of page.halves.entries()) {
      const halfNode = halfDivs[halfIndex];
      assert.equal(halfNode.attrs.subtype, half.position);
      assert.equal(halfNode.attrs['xml:id'], `yc-p${page.scanPage}-${half.position}`);
      const columns = children(halfNode, 'ab', 'column');
      assert.equal(columns.length, half.columns.length, '空欄仍必須保留 ab');
      assert.equal(columns.length, page.scanPage === 160 && half.position === 'upper' ? 8 : 16);
      const restored = [];
      for (const [index, column] of columns.entries()) {
        assert.equal(column.attrs['xml:id'], columnId(page.scanPage, half.position, index + 1));
        assert.equal(column.attrs.n, String(index + 1), '右至左欄序不可換序');
        assert.equal(column.attrs['xml:space'], 'preserve');
        assert.ok(elementChildren(column).every((child) => child.local === 'unclear' && child.ns === TEI_NS), '欄內不可插入候選或副文本');
        const restoredText = textContent(column);
        assert.equal(restoredText, half.columns[index], `欄文字改動 ${column.attrs['xml:id']}`);
        restored.push(restoredText);
        codepoints += Array.from(restoredText).length;
        columnCount += 1;
        if (restoredText === '') emptyColumns += 1;
      }
      reconstructed.push({ scanPage: page.scanPage, half: half.position, columns: restored });
      const figureNodes = children(halfNode, 'figure');
      assert.equal(figureNodes.length, (half.figures ?? []).length);
      for (const [index, figure] of (half.figures ?? []).entries()) {
        const node = figureNodes[index];
        assert.equal(node.attrs.type, figure.type ?? 'recorded-figure');
        if (figure.name !== undefined) assert.equal(textContent(one(node, 'head')), figure.name);
        assert.deepEqual(children(node, 'ab', 'figure-label').map(textContent), figure.labels ?? []);
        if (figure.note !== undefined) assert.equal(textContent(one(node, 'figDesc')), figure.note);
        figures += 1;
      }
    }
    const paratextNodes = children(pageNode, 'note', 'paratext');
    assert.equal(paratextNodes.length, (page.paratext ?? []).length);
    for (const [index, item] of (page.paratext ?? []).entries()) {
      assert.equal(paratextNodes[index].attrs.subtype, item.position);
      assert.equal(textContent(paratextNodes[index]), item.text ?? '');
      paratext += 1;
    }
    for (const [index, u] of page.uncertainties.entries()) {
      const record = ids.get(recordId(page.scanPage, index));
      const unclear = ids.get(doubtId(page.scanPage, index));
      const id = columnId(page.scanPage, u.half, u.column);
      assert.equal(unclear.parent.attrs['xml:id'], id);
      assert.equal(unclear.attrs.corresp, `#${recordId(page.scanPage, index)}`);
      assert.equal(record.attrs.corresp, `#${doubtId(page.scanPage, index)}`);
      assert.equal(field(record, 'column').attrs.target, `#${id}`);
      assert.equal(field(record, 'unicode-codepoint-start').attrs.value, String(offsetOf(u)));
      assert.equal(field(record, 'unicode-codepoint-length').attrs.value, String(Array.from(markerOf(u)).length));
      const preceding = unclear.parent.children.slice(0, unclear.parent.children.indexOf(unclear));
      assert.equal(Array.from(preceding.map((item) => typeof item === 'string' ? item : textContent(item)).join('')).length + 1, offsetOf(u), '疑字起點不是來源 Unicode 碼點位置');
      assert.equal(textContent(unclear), markerOf(u));
      assert.equal(textContent(field(record, 'recorded-marker')), markerOf(u));
      assert.deepEqual(JSON.parse(textContent(field(record, 'candidate-readings-json'))), candidatesOf(u));
      assert.equal(textContent(field(record, 'reason')), reasonOf(u));
      assert.equal(unclear.attrs.cert, 'low');
    }
  }
  assert.equal(columnCount, nodes.filter((node) => node.ns === TEI_NS && node.local === 'ab' && node.attrs.type === 'column').length);
  return { status: 'passed', sourceCorpusVersion: meta.datasetVersion, encodingVersion: ENCODING_VERSION,
    pages: pages.length, halves: reconstructed.length, columns: columnCount, emptyColumns,
    columnCodepoints: codepoints, uncertainties: expectedDoubts, figures, paratext,
    uniqueXmlIds: ids.size, resolvedLocalReferences: localReferences,
    sourceSnapshotSha256: sha256(raw), teiSha256: sha256(xml),
    limitations: ['只驗文字回復、欄序、metadata、來源參照及結構，不驗逐字辨讀準確率。',
      '未重新下載或重新驗證遠端 JPEG；頁面 SHA 是來源 JSON 當時的紀錄。',
      'Relax NG 驗證不包含 TEI Schematron 或自訂 ODD，也不是學術、雙校或權利認證。'] };
}

export async function validateWithXmllint(xmlPath, schemaPath) {
  const schema = await readFile(schemaPath);
  assert.equal(sha256(schema), SCHEMA_SHA256, 'schema 不是已固定校驗值的官方 TEI P5 4.12.0 tei_all.rng');
  const result = spawnSync('xmllint', ['--nonet', '--noout', '--relaxng', schemaPath, xmlPath], { encoding: 'utf8', maxBuffer: 1048576 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || 'XML/Relax NG 驗證失敗');
  return { relaxNgValidation: 'passed', teiGuidelinesVersion: TEI_VERSION, schemaSha256: SCHEMA_SHA256 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const xmlPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(directory, 'yichuan-fulltext.tei.xml');
  const sourcePath = process.argv[3] ? path.resolve(process.argv[3]) : null;
  const schemaPath = process.argv[4] ? path.resolve(process.argv[4]) : path.resolve(directory, '../schema/tei_all.rng');
  const validation = await validateWithXmllint(xmlPath, schemaPath);
  const source = sourcePath === null ? null : await readFile(sourcePath, 'utf8');
  const result = verifyTEI(await readFile(xmlPath, 'utf8'), source);
  console.log(JSON.stringify({ ...result, ...validation }, null, 2));
}
