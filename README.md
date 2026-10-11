# 《伊川易傳》文淵閣四庫全書本：全書影像初錄

整理署名：**一卦 yigua.art / [poplolioi11](https://github.com/poplolioi11)**。發行包版本 **0.2.0**，語料初錄版 **0.1.0**；首次發行日期 **2026-10-11**。原始 JSON／TXT 固定版本見 [v0.1.0](https://github.com/poplolioi11/yigua-yichuan-fulltext/releases/tag/v0.1.0)，本輪只增加 TEI 編碼與封存中繼資料，未改古籍文字。

正式封存：**[資料包 0.2.0 · DOI: 10.5281/zenodo.23299020](https://doi.org/10.5281/zenodo.23299020)**。學術引用請使用這個特定版本 DOI；[全版本 DOI](https://doi.org/10.5281/zenodo.23299019) 用於介紹持續維護的整個資料集，會指向最新封存版。封存包為 **0.2.0**，其中語料與 TEI 編碼各為 **0.1.0**，不能把包號誤當新一輪全文校對版號。

> 掃描頁 160–405，共 246 頁已完成影像初錄；**全部尚未獨立覆核，不是學術定本**。「完整」指指定範圍逐頁初錄完成，不保證每個印字均已辨認。疑字與方法保留於逐頁紀錄。TEI schema 驗證與 DOI 不是逐字正確性或同儕審查認證。

既有署名「yigua.art網站轉譯」指影像轉錄與資料整理，**不是把古文翻成現代語言**。歷史作者是程頤，資料整理者不取代原作者。

## 作品、底本與範圍

宋程頤《伊川易傳》四卷。底本為臺灣商務印書館《景印文淵閣四庫全書》第 9 冊所收文淵閣本的數位影像。**影印本具體出版年尚未核實，不以掃描上傳日期代替出版日期。**

- [維基共享資源原檔、影像與權利標示](https://commons.wikimedia.org/wiki/File:%E6%96%87%E6%B7%B5%E9%96%A3%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8_0009%E5%86%8A.djvu)：全冊 710 個掃描頁，來源標記 Public domain／PD-scan。
- 本資料包含掃描頁 **160–405，共 246 頁**；程頤序及卷一至四為 **162–405，共 244 頁**。
- 160 為卷首前附／御製題詩，161 為四庫館臣提要，與程頤作者文本分開記錄。
- 卷二起於 218、卷三起於 278、卷四起於 342；405 有未濟末文與卷四卷尾。406 起為《易學辨惑》，不收入本書。
- `scanPage` 是 DjVu 頁序，`printedPage` 是影印本冊頁碼，如 9-157；未辨讀的印頁碼保留空值，不用推算補定。

詳見 [PROVENANCE.md](PROVENANCE.md)。網站原有 `yichuan-guaci.json` 只是六十四卦卦首、卦辭程傳節錄，並非本次全書；不把它、Kanripo 或其他網站的現代電子稿用來填補全文。

## 下載與檔案

- [全書 TXT](exports/yichuan-fulltext.txt)：可直接閱讀，含本站新增的頁、半葉、欄定位標籤，非原書句讀。
- [全書 JSON](exports/yichuan-fulltext.json)：保留文字、疑字候選、圖記、副文本、來源影像與處理方法。
- [TEI P5 XML](tei/yichuan-fulltext.tei.xml)：按掃描頁、半葉與欄編碼，保留疑字及完整來源快照；[編碼與再現說明](tei/README-TEI.md)。不是另做校定的版本。
- [SHA256SUMS](exports/SHA256SUMS)：兩份資料檔的校驗值。
- [CITATION.cff](CITATION.cff)：機器可讀引用資訊；GitHub 可產生引用格式，**不會自動追蹤下載或引用**。
- [LICENSE.md](LICENSE.md) 與 [CONTRIBUTING.md](CONTRIBUTING.md)：分層授權、訂正與共同維護。

只想閱讀的人可直接下載 TXT；研究或改作請一併保留 JSON、版本及校驗值。資料本身沒有下載／使用者追蹤。公開包不含工作影像、原始 OCR、模型、執行環境、AI 協作紀錄或私人網站程式。

## 初錄方法與品質限制

先取得指定影像及逐頁 SHA-256；各頁由 AI 直接查看原尺寸工作影像，按上、下半葉與物理欄整理。部分頁參考本機 RapidOCR，實際方法記於 `method`。原始 OCR 一律視為未處理材料，不能當成已完成初錄；AI 視讀也不是獨立人工校勘。RapidOCR 步驟在本機執行，後續 AI 視讀使用 Codex 模型，不能稱整套流程完全離線。

欄序由右至左、欄內由上至下；通常每半葉 16 欄，160 上半葉卷首前附為 8 欄。題簽或空白半葉另記來源依據與副文本，不因沒有作者正文就省略。卦圖、版心、印頁碼與題署另記，不能全部混入程頤正文。

不加現代標點、不全域簡繁或異體正規化。無法確定的讀字用 `□` 與疑字紀錄表示；不以經文常識、模型記憶或另一電子全文靜默補字。但模型仍可能漏字、換成常見字、誤解大小字或輸出原頁沒有的文字，**本稿不是可靠的異文校勘本，也不是完全忠實的外交式轉錄**。

沒有疑字紀錄不表示每字均確定。引用關鍵字句、詞頻分析或版本學論證前，請回到該頁影像核對。

## 欄位與可再現檢查

JSON 根節點為 `meta` 與按頁序排列的 `pages`：

| 欄位 | 意義 |
| --- | --- |
| `meta.datasetVersion` | 資料版本，不是網站版本 |
| `scanPage`、`printedPage`、`role` | 掃描頁、印頁碼及文獻角色 |
| `status`、`transcriber`、`method` | 未覆核初錄狀態、處理者及實際方法 |
| `halves[].position`、`columns` | upper／lower 及逐物理欄文字；空欄仍占位 |
| `halves[].figures`、`paratext` | 圖像標籤、題署及版心等附屬資訊 |
| `uncertainties` | 半葉、欄、Unicode 碼點位置、疑字、候選及理由 |
| `source` | 逐頁公開影像網址、工作 JPEG SHA-256、大小與來源中記載的權利資訊 |

疑字欄位保留兩組相容記法：`positionInColumn`／`placeholder`／`note` 與 `position`／`marker`／`reason`；候選為 `visualCandidates` 或 `candidates`，可為空。欄與字元位置從 **1** 起算，字元按 Unicode 碼點，不是 UTF-16 索引。編輯文字時須同步修正定位。

在下載的儲存庫內，使用 Node.js 18 或更新版本執行：

```sh
node tools/verify-export.mjs
```

檢查 SHA-256、246 頁無缺漏／重複／錯序、半葉物理欄數、疑字位置、明示未覆核狀態、確切底本與頁序網址，以及 TXT 是否精確對應同份 JSON。工具**不會連網重新下載影像，也不驗文字準確率**；SHA-256 不是來源機構的數位簽章。

工作階段另檢查全部 246 張本機來源影像的 SHA-256，拒絕缺頁、未初錄整段或原始 OCR 直接匯出。工作用下載、OCR、完整性與匯出工具不在此公開包；公眾可重現的是本包的結構、內容一致性與檔案校驗，而非未提供模型紀錄的逐字辨讀過程。CFF 已按官方 1.2.0 schema 驗格式，格式有效不等於學術認證。

本包另提供 TEI P5 4.12.0 XML，使用官方 `tei_all.rng` 驗證格式，並由 XML 獨立回讀比對原始 JSON、逐欄文字、疑字及來源。沒有製作專屬 ODD、逐字影像座標或完整異文 apparatus；不將格式合規宣稱為文本校勘完成。詳細映射、schema 固定網址、測試與限制見 [TEI 說明](tei/README-TEI.md)。原 JSON／TXT 的 SHA-256 保持 0.1.0 不變；內嵌 JSON 的「尚無 TEI／DOI」是原始資料當時的歷史快照，不代表新增發行包的狀態。

## 學術引用

若使用本次封存的 JSON、TXT 或 TEI，建議引用（請依投稿規範調整格式）：

> poplolioi11（一卦 yigua.art）。（2026）。《伊川易傳》文淵閣四庫全書本：全書影像初錄（未獨立覆核）（發行包 0.2.0；語料 0.1.0）［資料集］。Zenodo。[https://doi.org/10.5281/zenodo.23299020](https://doi.org/10.5281/zenodo.23299020)

`CITATION.cff` 已記載這個版本 DOI，GitHub 的「Cite this repository」可產生引用格式；不需要在每個正文檔或程式檔重複填寫。DOI 識別的是這份資料包，不是程頤原著、整個網站或私有網站程式碼。可將它放入論文參考文獻、研究計畫、作品集或成果清單，但不得把未覆核初錄寫成學術定本或同儕審查成果。

請分開引用三層，不以本站取代古籍作者或館藏：

1. **原著**：程頤，《伊川易傳》，卷次與引文所在位置。
2. **底本／影像**：文淵閣四庫全書本《伊川易傳》，《景印文淵閣四庫全書》第 9 冊（臺灣商務印書館；本計畫影印出版年待核），印頁碼、DjVu 掃描頁及共享資源網址。
3. **數位初錄**：引用上列封存包 0.2.0 的版本 DOI，另記實際所用掃描頁、印頁碼、檔案 SHA-256、Git 提交識別碼及取用日期。如果實際取得的是早先 [GitHub v0.1.0 語料發行版](https://github.com/poplolioi11/yigua-yichuan-fulltext/releases/tag/v0.1.0)，應照實列 0.1.0 及固定發行連結，不把它誤寫成曾於本 DOI 封存的 0.2.0 發行包。

引用特定字句仍應按原圖核對。對文本校正、字形替換、標點或節錄所做改動，請另行註記，不讓讀者誤以為仍是原錄文字。`main` 可持續修改，固定發行版及校驗值更適合可重現引用。

`main` 上的說明文件可以持續補充；[v0.2.0 發行包](https://github.com/poplolioi11/yigua-yichuan-fulltext/releases/tag/v0.2.0) 與 Zenodo 所存檔案保持原樣。`PACKAGE-SHA256SUMS` 驗證的是該固定發行包，不是後續更新的 `main` 全部檔案；`exports/SHA256SUMS` 仍可驗證未變動的 JSON／TXT。

## 授權與署名

古籍原文屬公有領域，不因初錄、AI、OCR 或工時新增使用限制，可自由重用、商用及改作。請求保留「一卦 yigua.art / poplolioi11；yigua.art網站轉譯」及影像出處，便於追溯；這不是限制公有領域原文的條件。

具有著作權的本站原創說明與編排依 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；公開驗證工具單獨依 [0BSD](LICENSE-TOOLS.txt)。權利範圍詳見 [LICENSE.md](LICENSE.md)，不宣稱取得法律認證。私人網站程式碼及帳戶、統計、協作紀錄不隨資料公開。

## 訂正、版本與後續

[GitHub Issues](https://github.com/poplolioi11/yigua-yichuan-fulltext/issues) 開放影像有據的訂正，具體回報方式見 [CONTRIBUTING.md](CONTRIBUTING.md)。不必提供真實姓名或私人信箱；使用資料不以回報成果為條件。確定改字與仍存疑的候選分開記錄，發行新版並保存原版本與校驗值，不把整庫一次改稱校定本。

本專案希望讓文化資產與個體整理勞動成為他人創意的起點；歡迎研究、改作與共同訂正，但不能把 AI 初錄說成已經獨立人工雙校。更新見 [CHANGELOG.md](CHANGELOG.md)。

Zenodo 本包於 **2026-10-11** 封存發布，版本 DOI 為 [10.5281/zenodo.23299020](https://doi.org/10.5281/zenodo.23299020)。TEI 製備時的預留註記是當次歷史狀態，不是目前尚未發布。尚未投稿或通過同儕審查；取得 DOI 也不是校對認證。

- 引用或重現研究時，使用實際取得的**特定版本 DOI**；介紹整個持續維護的計畫時，可使用全版本 DOI。詳見 [Zenodo 版本引用建議](https://zenodo.org/help/versioning)。
- 日後校對改字或更新資料檔，另建固定發行版，經驗收後建立相連的 Zenodo 新版本，更新 `CITATION.cff` 的版本、日期與版本 DOI；保留舊版及疑字紀錄，不把新文字套用到舊 DOI 下。
- 單純補充 GitHub `main` 的 README 不另建立 Zenodo 版本、不改既有封存檔。本次補充的是引用說明，語料、XML、授權、既有發行包及 DOI 不變。
- GitHub 引用入口的行為見 [官方引用文件](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)。CFF 與 DOI 不會自動通知每次外部引用；公開引用線索與自願回報不能當作完整使用人數。

## English summary

An image-based first-pass transcription of Cheng Yi's *Yichuan Yizhuan*, Wenyuan-ge *Siku Quanshu* facsimile, volume 9, prepared by **一卦 yigua.art / poplolioi11**. Dataset 0.1.0 covers all 246 scan pages 160–405: the author's preface and four-juan text occupy 162–405, while edition front matter is separately identified. The facsimile publication year remains unverified.

All pages are explicitly **unreviewed**. AI image reading, sometimes assisted by local RapidOCR, is not independent human collation. Unresolved readings and methods are retained; structural checks do not establish textual accuracy. Package 0.2.0 adds TEI P5 XML without changing corpus 0.1.0 JSON/TXT. See the TEI mapping and validation limits; no custom ODD or complete critical apparatus is claimed. DOI: https://doi.org/10.5281/zenodo.23299020 (publication and registration status are authoritative on Zenodo). Cite the historical work, source images and this versioned dataset separately. Public-domain text remains unrestricted; CC BY 4.0 applies only where applicable to original documentation and editorial material. Standalone tools are 0BSD. Corrections are welcome through Issues; citation metadata does not automatically track reuse.
