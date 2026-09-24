# AWS Lab

在 AWS 上使用生成式 AI 的繁體中文互動教材。第一條路線是 **Amazon Bedrock**：平台是什麼、怎麼用 Converse API 呼叫模型、tool use、token 計費與 Guardrails。

AWS Lab 是學習系列中的一條路線，和 [Software Engineering Workshop](https://frobel0520.github.io/software-engineering-workshop/)、[Guardrail Workshop](https://frobel0520.github.io/guardrail-workshop/)、[AI Agent Tutorial](https://frobel0520.github.io/AI-Agent-Tutorial/) 平行，由[學習總入口](https://frobel0520.github.io/)串起來。

## 主題

| # | 主題 | 互動實驗 |
| --- | --- | --- |
| 1 | Bedrock 是什麼 | — |
| 2 | Converse API | 同一段對話的 Converse 請求 vs 各模型 InvokeModel 原生 body |
| 3 | Tool use 迴圈 | 逐步走一次 toolUse → toolResult 的來回 |
| 4 | 它是什麼、不是什麼 | — |
| 5 | Token 計費 | 從 `usage` 欄位算單次與每月費用 |
| 6 | Bedrock Guardrails | text unit 與各政策的檢查費用 |

所有實驗都在瀏覽器內以固定資料執行，**不呼叫 AWS、不需要任何憑證**。本站不內建模型單價；Guardrails 的預設單價取自 2026-09 的 AWS 定價頁，會標註來源日期。

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
| `frontend/src/lib/` | 可測試的純函式：請求格式轉換、tool use 流程、費用計算 |
| `frontend/src/labs/` | 互動實驗 UI |
| `frontend/src/topics/` | 各主題教材內容 |
| `.github/workflows/ci.yml` | 測試、型別檢查與正式建置 |
| `.github/workflows/deploy-pages.yml` | 發布到 GitHub Pages |

## 內容準確性

欄位名稱、請求格式與計費規則依 AWS 官方文件整理（2026-09）。model ID 僅供示意，實際可用的 ID、價格與各模型支援的功能請以官方文件為準。
