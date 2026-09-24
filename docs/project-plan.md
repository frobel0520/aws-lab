# AWS Lab：Project Plan

> 狀態：v0.2.0（Bedrock 與部署與權限兩條路線完成；網址 https://frobel0520.github.io/aws-lab/）
> 日期：2026-09-24

## 1. 定位

學習系列中的一條平行路線，和 Software Engineering Workshop、Guardrail Workshop、AI Agent Tutorial 地位相同，由學習總入口（`frobel0520.github.io`）串連。AWS Lab 不是其他專案的母站，不搬移、不重用其他 repo 的程式碼；主題相關時以「延伸學習」連結互相指引。

## 2. 設計原則

- 靜態網站，GitHub Pages 可直接部署；所有實驗在瀏覽器內以固定資料執行，不呼叫 AWS、不需憑證。
- 格式轉換、流程與計費邏輯寫成純函式並有單元測試；UI 只負責呈現。
- 不內建模型單價；有引用的價格一律標註來源與日期。

## 3. 任務

| Task | 內容 | 狀態 |
| --- | --- | --- |
| AWS-01 | 專案骨架、路由、課程資料、CI 與 Pages workflow | Done |
| AWS-02 | Bedrock 是什麼 | Done |
| AWS-03 | Converse API + 格式對照實驗 | Done |
| AWS-04 | Tool use 迴圈 + 逐步實驗 | Done |
| AWS-05 | 它是什麼、不是什麼 | Done |
| AWS-06 | Token 計費 + 費用試算 | Done |
| AWS-07 | Bedrock Guardrails + 檢查費用試算 | Done |
| AWS-08 | 建立 GitHub repo、啟用 Pages、上線驗證 | Done |
| AWS-09 | 部署與權限路線：IAM 與權限評估、S3 + CloudFront 靜態網站、Lambda 後端、GitHub Actions OIDC、整體架構，附 4 個實驗 | Done |
