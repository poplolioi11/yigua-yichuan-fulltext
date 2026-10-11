// SPDX-License-Identifier: 0BSD
// Maintainer: 一卦 yigua.art / poplolioi11
// Mechanical encoding only: no network access, correction, or normalization.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEI_NS = 'http://www.tei-c.org/ns/1.0';
export const JSON_NS = 'https://yigua.art/ns/source-json/1.0';
export const ENCODING_VERSION = '0.1.0';
export const ENCODING_DATE = '2026-10-11';
export const TEI_VERSION = '4.12.0';
export const SCHEMA_URL = 'https://www.tei-c.org/Vault/P5/4.12.0/xml/tei/custom/schema/relaxng/tei_all.rng';
export const FROZEN_SOURCE_SHA256 = '5f07e263a261ed05beacd6208caba5c729a2f8909788f898315c9a5ca6513955';
export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
export const columnId = (page, half, number) => `yc-p${page}-${half}-c${String(number).padStart(2, '0')}`;
export const doubtId = (page, index) => `yc-p${page}-u${String(index + 1).padStart(3, '0')}`;
export const recordId = (page, index) => `${doubtId(page, index)}-record`;
export const offsetOf = (u) => u.positionInColumn ?? u.position;
export const markerOf = (u) => u.placeholder ?? u.marker;
export const reasonOf = (u) => u.note ?? u.reason;
export const candidatesOf = (u) => u.visualCandidates ?? u.candidates ?? [];

export async function defaultSourcePath(directory) {
  const source = path.resolve(directory, '../exports/yichuan-fulltext.json');
  try { await access(source); return source; }
  catch { throw new Error('找不到發行包 exports/ 內的來源 JSON；請用第一個參數指定固定來源檔。'); }
}

export function xmlEscape(value) {
  const text = String(value);
  for (const char of text) {
    const cp = char.codePointAt(0);
    assert.ok(cp === 9 || cp === 10 || cp === 13 || (cp >= 32 && cp <= 0xd7ff)
      || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff), 'XML 1.0 禁止字元');
  }
  return text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;').replace(/'/gu, '&apos;').replace(/\r/gu, '&#xD;');
}

export function normalizeDoi(value) {
  if (value === undefined || value === null || value === '') return null;
  const doi = String(value).replace(/^https:\/\/doi\.org\//iu, '');
  assert.match(doi, /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/iu, 'DOI 語法不合法；語法檢查不驗證 DOI 的平台狀態');
  return doi;
}

export function encodeColumn(page, half, number) {
  const text = half.columns[number - 1];
  const chars = Array.from(text);
  const doubts = page.uncertainties.map((u, index) => ({ u, index }))
    .filter(({ u }) => u.half === half.position && u.column === number)
    .sort((a, b) => offsetOf(a.u) - offsetOf(b.u));
  let cursor = 0;
  let encoded = '';
  for (const { u, index } of doubts) {
    const start = offsetOf(u) - 1;
    const marker = markerOf(u);
    const length = Array.from(marker).length;
    assert.ok(Number.isInteger(start) && start >= cursor && length > 0, '疑字定位重疊或無效');
    assert.equal(chars.slice(start, start + length).join(''), marker, '疑字定位不能對應原欄文字');
    encoded += xmlEscape(chars.slice(cursor, start).join(''));
    encoded += `<unclear xml:id="${doubtId(page.scanPage, index)}" corresp="#${recordId(page.scanPage, index)}" cert="low" reason="unresolved-reading">${xmlEscape(marker)}</unclear>`;
    cursor = start + length;
  }
  return encoded + xmlEscape(chars.slice(cursor).join(''));
}

export function renderTEI(sourceJSONText, { doi = null } = {}) {
  const dataset = JSON.parse(sourceJSONText);
  const { meta, pages } = dataset;
  const normalizedDoi = normalizeDoi(doi);
  const allColumns = pages.flatMap((p) => p.halves.flatMap((h) => h.columns));
  const chars = allColumns.reduce((count, column) => count + Array.from(column).length, 0);
  const uncertaintyCount = pages.reduce((count, page) => count + page.uncertainties.length, 0);
  assert.equal(meta.independentCollationCompleted, false);
  assert.equal(meta.status, 'complete-first-pass-unreviewed');
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<?xml-model href="${SCHEMA_URL}" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>`,
    `<TEI xmlns="${TEI_NS}" xml:id="yc-tei" xml:lang="zh-Hant" version="${TEI_VERSION}">`,
    '  <teiHeader>',
    '    <fileDesc>',
    '      <titleStmt>',
    `        <title>${xmlEscape(meta.title)}：TEI 物理頁欄編碼</title>`,
    `        <author role="historical-author-of-preface-and-commentary">${xmlEscape(meta.historicalAuthor)}</author>`,
    `        <respStmt xml:id="yc-preparer"><resp>影像初錄與資料整理；程頤序及正文始於掃描頁 162，160–161 前附文獻不歸給程頤</resp><name>${xmlEscape(meta.preparedBy)}</name></respStmt>`,
    '        <respStmt xml:id="yc-encoder"><resp>由公開 JSON 決定性轉換為 TEI；未重新辨讀、校勘或補字</resp><name>一卦 yigua.art / poplolioi11（Codex 輔助製作轉換工具）</name></respStmt>',
    '      </titleStmt>',
    `      <editionStmt><edition n="${ENCODING_VERSION}">TEI 編碼版 ${ENCODING_VERSION}；來源初錄資料版 ${xmlEscape(meta.datasetVersion)}</edition></editionStmt>`,
    `      <extent>${pages.length} 掃描頁；${allColumns.length} 個記錄欄位；${chars} 欄內 Unicode 碼點；${uncertaintyCount} 筆疑字紀錄</extent>`,
    '      <publicationStmt>',
    `        <publisher>${xmlEscape(meta.preparedBy)}</publisher>`,
    `        <date when="${ENCODING_DATE}">${ENCODING_DATE}</date>`,
    `        <idno type="URI">${xmlEscape(meta.repositoryUrl)}</idno>`,
    ...(normalizedDoi ? [`        <idno type="DOI">${xmlEscape(normalizedDoi)}</idno>`] : []),
    '        <availability status="free">',
    '          <p>古籍原文屬公有領域，不因初錄、AI 或 TEI 編碼新增排他限制；署名及影像出處為來源追溯請求。</p>',
    '          <licence target="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0 僅適用於具有著作權的原創說明與編排，不將公有領域原文重新私有化。</licence>',
    '          <p>轉換與驗證工具依 0BSD；來源影像按所記錄的 Public domain 標示另行查核。</p>',
    '        </availability>',
    '      </publicationStmt>',
    '      <notesStmt>',
    '        <note type="quality-status">所有頁面均為未獨立覆核的影像初錄，不是學術定本；結構驗證不證明逐字準確率、人工雙校或同儕審查。</note>',
    ...(normalizedDoi ? ['        <note type="doi-publication-state">DOI 識別碼僅為引用資訊；不能單憑本 header 判定 Zenodo 已正式封存。正式發布狀態請查 Zenodo 平台紀錄，DOI 不表示校對或學術認證。</note>'] : []),
    '        <note type="authorship-scope">160 為版本題簽及御製題詩；161 為四庫館臣提要。歷史作者標記只指程頤序及四卷文本，不把前附文獻、館臣署名或整理者歸給程頤。</note>',
    '      </notesStmt>',
    '      <sourceDesc>',
    `        <bibl><title>${xmlEscape(meta.sourceEdition)}</title><publisher>${xmlEscape(meta.facsimilePublisher)}</publisher><note>影印出版年未核實，保留來源空值。</note>`,
    `          <note>文淵閣四庫全書本《伊川易傳》，所錄 DjVu 掃描頁 ${meta.scope.firstScanPage}–${meta.scope.lastScanPage}；程頤序及四卷 ${meta.scope.authorTextFirstPage}–${meta.scope.lastScanPage}。來源全冊 710 掃描頁，第 406 頁另書不收入。</note>`,
    `          <note><ref target="${xmlEscape(pages[0].source.descriptionUrl)}">維基共享資源原檔說明頁</ref>；逐頁合併 JPEG 網址保存在 facsimile，各頁所記錄來源 SHA-256 及方法完整保存在 xenoData。</note>`,
    `          <note>來源為公開資料版 ${xmlEscape(meta.datasetVersion)} 的 yichuan-fulltext.json；SHA-256 ${sha256(sourceJSONText)}。此校驗值指 JSON，不是原始 DjVu 或來源機構數位簽章。</note>`,
    '        </bibl>',
    '      </sourceDesc>',
    '    </fileDesc>',
    '    <encodingDesc>',
    '      <projectDesc><p>本編碼只表達既有物理頁、半葉及欄記錄，不依頁面角色猜分語義卦節。掃描頁升序，upper 先於 lower，每半葉欄序由右至左，欄內由上至下。</p></projectDesc>',
    '      <editorialDecl><p>各 ab[@type="column"] 的文字值精確保留來源欄字串，包括空字串與 □；不加標點、不正規化字形、不添加物理行分界。90 筆既有疑字只在碼點定位能逐字對應時包入 unclear；候選、理由及一日起算的 Unicode 碼點定位另存 standOff。空欄可能是卦圖、題簽或空白，不臆造 gap 或缺文。xenoData 的自訂命名空間保留完整原始 JSON，包含所有方法、狀態、作者角色、副文本、圖記及訂正說明。</p></editorialDecl>',
    '    </encodingDesc>',
    '    <profileDesc><langUsage><language ident="zh-Hant">繁體古漢語初錄；保留來源字形及異體</language></langUsage></profileDesc>',
    '    <xenoData xml:id="yc-source-snapshot" type="frozen-source-json">',
    `      <yc:sourceJSON xmlns:yc="${JSON_NS}" mediaType="application/json" encoding="UTF-8" corpusVersion="${xmlEscape(meta.datasetVersion)}" sourceFilename="yichuan-fulltext.json" sha256="${sha256(sourceJSONText)}" xml:space="preserve">${xmlEscape(sourceJSONText)}</yc:sourceJSON>`,
    '    </xenoData>',
    `    <revisionDesc status="unreviewed"><change when="${ENCODING_DATE}" who="#yc-encoder">TEI 編碼 ${ENCODING_VERSION}：由固定來源 JSON 機械轉換及無損驗證，沒有重作初錄或獨立校勘。內嵌 sourceJSON 保留來源版當時的「尚無 TEI／DOI」限制文字，屬歷史快照；目前編碼與 DOI 狀態以本文件原生 header 及發行資訊為準。</change></revisionDesc>`,
    '  </teiHeader>',
    '  <facsimile xml:id="yc-facsimile">',
  ];
  for (const page of pages) {
    lines.push(`    <surface xml:id="yc-s${page.scanPage}" n="${page.scanPage}" type="combined-scan-page"><graphic url="${xmlEscape(page.source.imageUrl)}" mimeType="image/jpeg"/></surface>`);
  }
  lines.push('  </facsimile>', '  <standOff>', '    <listAnnotation type="uncertainty-records">');
  for (const page of pages) {
    page.uncertainties.forEach((u, index) => {
      const id = columnId(page.scanPage, u.half, u.column);
      lines.push(`      <note xml:id="${recordId(page.scanPage, index)}" type="uncertainty-record" corresp="#${doubtId(page.scanPage, index)}"><ptr type="column" target="#${id}"/><num type="unicode-codepoint-start" value="${offsetOf(u)}">${offsetOf(u)}</num><num type="unicode-codepoint-length" value="${Array.from(markerOf(u)).length}">${Array.from(markerOf(u)).length}</num><seg type="recorded-marker">${xmlEscape(markerOf(u))}</seg><seg type="candidate-readings-json">${xmlEscape(JSON.stringify(candidatesOf(u)))}</seg><seg type="reason">${xmlEscape(reasonOf(u))}</seg></note>`);
    });
  }
  lines.push('    </listAnnotation>', '  </standOff>', '  <text xml:id="yc-transcription"><body>');
  for (const page of pages) {
    lines.push(`    <div xml:id="yc-p${page.scanPage}" type="scan-page" subtype="${xmlEscape(page.role)}" n="${page.scanPage}" facs="#yc-s${page.scanPage}">`);
    lines.push(`      <note type="transcription-status">${xmlEscape(page.status)}</note>`);
    lines.push(`      <note type="transcriber">${xmlEscape(page.transcriber)}</note>`);
    lines.push(`      <note type="method">${xmlEscape(page.method)}</note>`);
    if (page.printedPage !== null) lines.push(`      <note type="printed-page">${xmlEscape(page.printedPage)}</note>`);
    if (page.revisionNote !== undefined) lines.push(`      <note type="source-revision-note">${xmlEscape(typeof page.revisionNote === 'string' ? page.revisionNote : JSON.stringify(page.revisionNote))}</note>`);
    if (page.scanPage < meta.scope.authorTextFirstPage) lines.push('      <note type="authorship">版本前附文獻；不歸給程頤。詳見來源 JSON 的 role、authorship 與 notes。</note>');
    for (const half of page.halves) {
      lines.push(`      <div xml:id="yc-p${page.scanPage}-${half.position}" type="half-page" subtype="${half.position}" n="${half.position}" rend="columns-right-to-left text-top-to-bottom" facs="#yc-s${page.scanPage}">`);
      if (half.section !== undefined) lines.push(`        <note type="source-section-label">${xmlEscape(half.section)}</note>`);
      half.columns.forEach((column, index) => {
        lines.push(`        <ab xml:id="${columnId(page.scanPage, half.position, index + 1)}" type="column" n="${index + 1}" xml:space="preserve">${encodeColumn(page, half, index + 1)}</ab>`);
      });
      (half.figures ?? []).forEach((figure, index) => {
        const target = Number.isInteger(figure.column) ? ` corresp="#${columnId(page.scanPage, half.position, figure.column)}"` : '';
        lines.push(`        <figure xml:id="yc-p${page.scanPage}-${half.position}-f${index + 1}" type="${xmlEscape(figure.type ?? 'recorded-figure')}" facs="#yc-s${page.scanPage}"${target}>`);
        if (figure.name !== undefined) lines.push(`          <head>${xmlEscape(figure.name)}</head>`);
        for (const label of figure.labels ?? []) lines.push(`          <ab type="figure-label" xml:space="preserve">${xmlEscape(label)}</ab>`);
        if (figure.note !== undefined) lines.push(`          <figDesc>${xmlEscape(figure.note)}</figDesc>`);
        lines.push('        </figure>');
      });
      lines.push('      </div>');
    }
    for (const [index, item] of (page.paratext ?? []).entries()) {
      lines.push(`      <note xml:id="yc-p${page.scanPage}-paratext-${index + 1}" type="paratext" subtype="${xmlEscape(item.position)}" facs="#yc-s${page.scanPage}" xml:space="preserve">${xmlEscape(item.text ?? '')}</note>`);
    }
    lines.push('    </div>');
  }
  lines.push('  </body></text>', '</TEI>', '');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const source = process.argv[2] ? path.resolve(process.argv[2])
    : await defaultSourcePath(directory);
  const output = process.argv[3] ? path.resolve(process.argv[3]) : path.join(directory, 'yichuan-fulltext.tei.xml');
  const raw = await readFile(source, 'utf8');
  assert.equal(sha256(raw), FROZEN_SOURCE_SHA256, '不是本編碼版固定的來源 JSON；請另立來源／編碼版，不覆寫固定語料');
  const xml = renderTEI(raw, { doi: process.argv[4] });
  await writeFile(output, xml, 'utf8');
  console.log(JSON.stringify({ output: path.basename(output), encodingVersion: ENCODING_VERSION,
    sourceCorpusVersion: JSON.parse(raw).meta.datasetVersion, sourceSha256: sha256(raw),
    teiSha256: sha256(xml), doi: normalizeDoi(process.argv[4]) }, null, 2));
}
