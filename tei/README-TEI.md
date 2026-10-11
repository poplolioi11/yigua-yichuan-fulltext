# 《伊川易傳》初錄的 TEI 物理頁欄編碼

整理署名：一卦 yigua.art / [poplolioi11](https://github.com/poplolioi11)；保留來源署名「yigua.art網站轉譯」。歷史作者宋程頤，影像初錄整理者及 TEI 編碼者不取代原作者。

TEI 編碼版 **0.1.0**，製備日期 **2026-10-11**；來源語料版 **0.1.0**，來源為公開的 [yigua-yichuan-fulltext v0.1.0](https://github.com/poplolioi11/yigua-yichuan-fulltext/releases/tag/v0.1.0)。如果整個發行包採 0.2.0，那是新增 TEI／封存資訊的**發行包版本**，不是重新辨讀或改寫原始 JSON／TXT。三者應分別記錄。

本編碼以固定 JSON 為唯一文字來源，包含掃描頁 160–405 的 246 頁。**全部仍為未獨立覆核的影像初錄，不是學術定本。** 沒有加入現代電子全文、現代句讀、默認定字、正規化異體或準確率主張。

TEI 原生 header 記錄 DOI `10.5281/zenodo.23299020`。製備時由整合工作流程取得的證據是 Zenodo 草稿預留識別碼，不能單憑 XML 的 `idno` 宣稱已正式封存；正式發布狀態應查 [Zenodo 該筆記錄](https://zenodo.org/records/23299020)。取得 DOI 不表示獨立校對、同儕審查或文本準確。

## 檔案與依賴

- `yichuan-fulltext.tei.xml`：UTF-8 TEI P5 XML；內嵌完整原始來源 JSON。
- `convert-tei.mjs`：決定性轉換工具，只讀指定固定來源，不連網、不修改來源。
- `verify-tei.mjs`：以 `xmllint` 檢查 XML 及 Relax NG，再核對原始快照、文字、metadata、欄序、疑字定位及參照。
- `test-tei.mjs`：14 項正向及負向檢查；測試夾具只留在記憶體。
- `LICENSE-TOOLS.txt`：上述三份工具的 0BSD 授權。

使用 Node.js 18 或更新版本與 `xmllint`，不需安裝其他 Node 套件。工具在 `tei/` 下時，預設讀取同一發行包的 `exports/yichuan-fulltext.json`；也可明確給路徑。schema 預設在同一包的 `schema/tei_all.rng`。離線驗證需已有該 schema；XML 的 `xml-model` 使用固定版官方 URL，工具不自行下載。

從發行包根目錄執行：

```sh
node tei/convert-tei.mjs exports/yichuan-fulltext.json tei/yichuan-fulltext.tei.xml 10.5281/zenodo.23299020
node tei/verify-tei.mjs tei/yichuan-fulltext.tei.xml exports/yichuan-fulltext.json schema/tei_all.rng
node tei/test-tei.mjs exports/yichuan-fulltext.json tei/yichuan-fulltext.tei.xml schema/tei_all.rng
```

轉換器第 4 個參數可省略；省略時不產生原生 DOI `idno`。DOI 參數只驗語法，不查平台狀態，只有經平台證實的識別碼才應用於正式製備。現有來源 SHA 不符時，轉換器拒絕覆寫；應另立來源／編碼版。

## 編碼方式

| 原始 JSON | TEI 表達 |
| --- | --- |
| `scanPage`、`role` | `div[@type="scan-page"]/@n`、`@subtype`；頁碼按 160–405 升序 |
| `source.imageUrl` | 每個合併掃描 JPEG 各有一個 `facsimile/surface/graphic`；恰 246 個 surface |
| `halves[].position` | page div 內 `div[@type="half-page"]/@subtype`，upper 先於 lower |
| `columns[]` | `ab[@type="column"]`，欄序從 1 起算，由右至左；文字值精確對應原欄字串 |
| `uncertainties` | 已能對應的 □ 包入 `unclear`；候選、理由、原 marker 及 Unicode 碼點定位存 `standOff/listAnnotation/note` |
| `figures`、`paratext` | 原生 `figure`、圖旁標籤及 `note[@type="paratext"]`；全部原始屬性另外留在 JSON 快照 |
| 所有原始欄位與 JSON 檔格式 | `teiHeader/xenoData/yc:sourceJSON`，`yc` 為非 TEI namespace `https://yigua.art/ns/source-json/1.0` |

`ab` 文字值應把子元素文字串接，例如 XPath `string(tei:ab)`；`unclear` 只包住來源既有 marker，**沒有把候選替換成定字**。疑字起點與長度都按 Unicode 碼點，而不是 JavaScript UTF-16 索引。90 筆定位均通過原欄字串比對；小字分欄等額外 metadata 也完整保留在原始 JSON 中，不臆造逐字影像座標。

7,864 個 `ab[@type="column"]` 包含 187 個空字串欄。空字串可能代表圖欄、題簽或有影像依據的空白；它不是統一的「原頁空白」或「缺文」。160 上半葉的 8 欄沿用來源可見題名／署名文字組，來源已明示未設完整欄格，其 `columnLayout` 保存在快照。

不新增 `zone` 座標、物理 `lb` 行分界、`gap`、`supplied` 或校改 `corr`。不按 page `role` 的卦名猜分語義卦節，也不把整個掃描 JPEG 宣稱為兩份分離的原葉照片。

160 的御製題詩、版本題簽及署名，以及 161 的四庫館臣提要，分別保留 `edition-title-and-imperial-poem-frontmatter`、`siku-editorial-preface` 角色；原生作者欄位明確限定為程頤序及程傳正文，這兩頁不歸給程頤。底本影印出版年未核實，來源空值未推算補定。

完整來源快照無損保存 `meta`、各頁 `status`、`transcriber`、`method`、`source`、`reviewLimitations`、`revisionNote`、`authorship`、副文本、圖記、小字與所有疑字欄位。來源版 0.1.0 的 `meta.limitations` 仍含當時「未製作 TEI／未取得 DOI」文字；這是保留的**歷史來源快照**，不是本發行包目前狀態。不得為了新增封存資訊而改寫固定來源檔。

## 驗證結果

2026-10-11 完成以下機械驗證：

- 官方 [TEI P5 4.12.0 `tei_all.rng`](https://www.tei-c.org/Vault/P5/4.12.0/xml/tei/custom/schema/relaxng/tei_all.rng) Relax NG 驗證通過。
- 原始 JSON 完整字串可由 `xenoData` 回復，SHA-256 與來源原檔完全相同。
- 246 頁、492 半葉、7,864 欄、130,438 欄內 Unicode 碼點逐欄精確回復，包含 187 空欄。
- 90 筆疑字的 marker、位置、候選、理由與雙向參照一致；65 個圖記及 775 筆副文本一致。
- 9,874 個 `xml:id` 唯一；1,914 個內部參照全部可解。
- 14 項測試通過，會拒絕改字、遺漏空欄、換欄順序、改候選、改碼點起點、錯頁影像、斷裂參照、重複識別碼與改動快照；另以非 BMP 字元、XML 保留字元及 CR／LF／TAB 證實碼點與文字回復。這些字元只加入記憶體中的測試夾具，正式欄文字無補充平面字元。

固定校驗值：

```text
source JSON: 5f07e263a261ed05beacd6208caba5c729a2f8909788f898315c9a5ca6513955
TEI XML:     fdd12ccf70485e5eb049d0cdcde90b41b5d89ca814160a9ee13817ad693dc4ee
TEI schema:  b0f115095ead2ccc6933aa3365c6f4a82cba3b2ec7eee7f76bb616d7a63b7e48
```

這是 XML／Relax NG 與內容一致性驗證，**不是 TEI Schematron 全套驗證，也沒有自訂 ODD**。寬泛 `tei_all` schema 容許的內容另由本工具的明確規則核對。工具的樹狀讀取器只處理本生成器使用的 XML 子集；正式 CLI 先由 libxml2 檢查 XML，不接受 DTD 或外部 entity，不宣稱支援任意 TEI 文件。

沒有重新下載遠端影像、校驗影像當下內容、獨立辨讀或估算文字準確率；來源 JSON 中的逐頁 JPEG SHA 是取得時的紀錄。結構驗證、DOI、開放授權或發行版本都不是學術、法律或原字形忠實度認證。引用關鍵字句仍應回到原影像覆核。

## 授權與引用

古籍原文維持公有領域；CC BY 4.0 只適用於具有著作權的原創說明與編排；工具依 `LICENSE-TOOLS.txt` 的 0BSD。第三方 TEI schema 依 TEI Consortium 自身的授權，不因隨包提供而套用本站工具授權。來源影像的 Public domain 標示屬記錄的來源資訊，不對所有司法管轄區作額外法律保證。私人網站程式與私人工作紀錄不在本 TEI 包內。

引用時分別記錄程頤原著、文淵閣影印底本／掃描頁與本站數位初錄；另記來源語料 0.1.0、TEI 編碼 0.1.0、實際發行包版本及所用檔案 SHA-256。訂正或改字應另立版本並保留原稿，請使用 [GitHub Issues](https://github.com/poplolioi11/yigua-yichuan-fulltext/issues) 提供原影像、掃描頁、半葉、欄與碼點位置。
