# AWS Lab

在 AWS 上使用生成式 AI 的繁體中文互動教材，分兩條路線：**Amazon Bedrock**（怎麼呼叫模型、怎麼計費與防護），以及**部署與權限**（用 IAM、S3 + CloudFront、Lambda 與 GitHub Actions OIDC 把應用安全地放上 AWS）。

AWS Lab 是學習系列中的一條路線，和 [Software Engineering Workshop](https://frobel0520.github.io/software-engineering-workshop/)、[Guardrail Workshop](https://frobel0520.github.io/guardrail-workshop/)、[AI Agent Tutorial](https://frobel0520.github.io/AI-Agent-Tutorial/) 平行，由[學習總入口](https://frobel0520.github.io/)串起來。

## 主題

### Amazon Bedrock

| # | 主題 | 互動實驗 |
| --- | --- | --- |
| 1 | Bedrock 是什麼 | — |
| 2 | Converse API | 同一段對話的 Converse 請求 vs 各模型 InvokeModel 原生 body |
| 3 | Tool use 迴圈 | 逐步走一次 toolUse → toolResult 的來回 |
| 4 | 它是什麼、不是什麼 | — |
| 5 | Token 計費 | 從 `usage` 欄位算單次與每月費用 |
| 6 | Bedrock Guardrails | text unit 與各政策的檢查費用 |

### 部署與權限

| # | 主題 | 互動實驗 |
| --- | --- | --- |
| 1 | IAM 與權限評估 | 勾選政策，看每個請求是允許、明確拒絕還是預設拒絕 |
| 2 | S3 + CloudFront 靜態網站 | 從 `dist/` 檔案清單產生快取設定、`s3 sync` 指令順序與 invalidation 路徑 |
| 3 | Lambda：呼叫 Bedrock 的後端 | 檢查 timeout、存取控制、併發與執行角色的上線風險 |
| 4 | GitHub Actions 用 OIDC 部署 | 依觸發方式產生 `sub`，比對 trust policy 條件 |
| 5 | 把 Bedrock 應用放上 AWS | — |

所有實驗都在瀏覽器內以固定資料執行，**不呼叫 AWS、不需要任何憑證**。本站不內建模型單價；Guardrails 的預設單價取自 2026-09 的 AWS 定價頁，會標註來源日期。IAM 模擬器只處理單一帳號內身分型政策的 Effect、Action、Resource。

## 本機啟動

```bash
cd frontend
npm install
npm run dev
```

## 驗證

```bash
cd frontend
npm test
npm run build
```

## 架構

| 路徑 | 內容 |
| --- | --- |
| `frontend/src/curriculum.ts` | 路線與主題清單（唯一來源） |
| `frontend/src/lib/` | 可測試的純函式：請求格式轉換、tool use 流程、費用計算、IAM 評估、部署計畫、Lambda 設定檢查、OIDC `sub` 比對 |
| `frontend/src/labs/` | 互動實驗 UI |
| `frontend/src/topics/` | 各主題教材內容 |
| `.github/workflows/ci.yml` | 測試、型別檢查與正式建置 |
| `.github/workflows/deploy-pages.yml` | 發布到 GitHub Pages |

## 內容準確性

欄位名稱、請求格式與計費規則依 AWS 官方文件整理（2026-09）。model ID 僅供示意，實際可用的 ID、價格與各模型支援的功能請以官方文件為準。
