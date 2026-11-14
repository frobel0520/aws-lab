# AWS Lab 系統設計（精簡版）

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊；對應既有的 [`project-plan.md`](project-plan.md) |
| 專案級別 | 公開級 |
| 每月預算上限 | NT$0（零月費硬性規則） |
| 版控／部署 | GitHub `frobel0520/aws-lab`／GitHub Pages |

## 1. 設計限制與原則

- **純靜態前端、無真實 AWS 呼叫**：所有課程範例與互動實驗室都在瀏覽器內以固定模擬資料執行，不需 AWS 帳號或憑證，也不向真實 AWS API 發出請求。
- **零月費**：只使用 GitHub Pages 與 GitHub Actions 公開 repo 免費額度，沒有後端主機、資料庫或按量計費服務。
- **核心邏輯與 UI 分離**：計費、IAM 權限評估、OIDC 條件比對、部署計畫與工具迴圈模擬皆封裝於純函式模組，並附對應單元測試。
- **價格標示原則**：頁面引用的 AWS 官方定價皆標註來源與查詢日期（2026-09），不假裝即時報價。

## 2. 架構總覽

```text
GitHub repo（main）
  └─ GitHub Actions（ci.yml / deploy-pages.yml）
       ├─ npm ci → npm audit --audit-level=high → npm test → npm run build
       └─ VITE_BASE=/aws-lab/ npm run build → GitHub Pages（dist/）
            └─ 瀏覽器 SPA（Hash Routing：#/ 與 #/<topicId>）
                 ├─ 課程地圖與 11 個主題頁（topics/）
                 ├─ 8 個互動實驗室（labs/）
                 └─ 純函式計算引擎（lib/*.ts）
```

- **技術棧**：React 19、TypeScript 5.7、Vite 8.3.5（`@vitejs/plugin-react`）、Vitest 4.1.12。
- **路由與靜態回退**：`frontend/src/router.ts` 採用 Hash Routing（`#` 為課程地圖，`#/<topicId>` 為主題頁）；`deploy-pages.yml` 建置時將 `dist/index.html` 複製為 `dist/404.html`。
- **安全標頭與嵌入**：`frontend/index.html` 透過 `<meta http-equiv="Content-Security-Policy">` 設定 CSP，並載入 Harbor 維護狀態腳本（`data-project="aws-lab"`）。

## 3. 目錄與互動元件

```text
frontend/src/
  curriculum.ts       兩條主線（Amazon Bedrock、部署與權限）共 11 個主題定義
  router.ts           Hash 路由解析與對應單元測試
  sites.ts            Learning Atlas 與同系列工作坊互連清單
  components/         CodeBlock.tsx、ui.tsx 共用介面元件
  topics/             11 個主題教學頁（BedrockTopic ～ ArchitectureTopic）
  labs/               8 個互動實驗室
  lib/                7 個純函式邏輯模組與 *.test.ts 單元測試
```

| 實驗室元件 | 對應主題 | 核心互動與邏輯模組 |
|---|---|---|
| `FormatLab.tsx` | Converse API | 比較 Converse API 與各模型原生 `InvokeModel` payload（`lib/converse.ts`） |
| `ToolLoopLab.tsx` | Tool use 迴圈 | 逐步模擬 `toolUse`、`toolResult` 與 `stopReason` 迴圈（`lib/toolLoop.ts`） |
| `CostLab.tsx` | Token 計費 | 依輸入／輸出 token 與快取命中試算單次與月度費用（`lib/cost.ts`） |
| `GuardrailCostLab.tsx` | Bedrock Guardrails | 試算文本單位與護欄檢查成本（`lib/cost.ts`） |
| `PolicyLab.tsx` | IAM 與權限評估 | 模擬 Effect、Action、Resource 的 Allow／Explicit Deny／Default Deny（`lib/iam.ts`） |
| `DeployPlanLab.tsx` | S3 + CloudFront | 依檔案清單產生快取策略、`s3 sync` 順序與 invalidation 路徑（`lib/deployPlan.ts`） |
| `LambdaReviewLab.tsx` | Lambda 後端 | 檢核逾時、AuthType、並行度與 IAM 執行角色風險（`lib/lambdaReview.ts`） |
| `OidcLab.tsx` | GitHub Actions OIDC | 依觸發條件產生 `sub` 字串並測試 IAM Trust Policy 比對（`lib/oidc.ts`） |

## 4. 部署與 CI 驗證

- **CI（`.github/workflows/ci.yml`）**：Node 22 環境於 `frontend/` 執行 `npm ci`、`npm audit --audit-level=high`、`npm test`（`vitest run`）、`npm run build`（`tsc -b && vite build`）。
- **部署（`.github/workflows/deploy-pages.yml`）**：僅於 `refs/heads/main` 且 actor 為 repo 擁有者時，帶入 `VITE_BASE=/aws-lab/` 建置並透過 `actions/deploy-pages@v4` 發布至 GitHub Pages。

## 5. 零月費與效能邊界

| 項目 | 現況與邊界 |
|---|---|
| 託管與算力 | GitHub Pages 靜態託管 + GitHub Actions 公開 repo 免費額度；無任何雲端後端或資料庫 |
| 外部資源 | 僅載入 Google Fonts（preconnect）與 Harbor 維護檢查腳本（非同步載入，不影響主功能） |
| 前端產物與速度 | Vite 打包純靜態資源（停用 sourcemap）；全站採前端 Hash 切換，無 API 往返延遲 |
| 效能驗收狀態 | 已通過 TypeScript 型別檢查、Vitest 單元測試與 Vite 正式建置；正式頁面載入數據（p50/p95）尚未建立量化紀錄（待補） |
