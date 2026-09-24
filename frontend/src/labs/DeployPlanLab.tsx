import { useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Lab } from "../components/ui";
import { buildDeployPlan, type FileKind } from "../lib/deployPlan";

const KIND_LABEL: Record<FileKind, string> = {
  hashed: "帶 hash",
  html: "HTML",
  other: "其他",
};

// 取自本站某次 npm run build 的 dist/ 內容。
const DEFAULT_FILES = ["index.html", "404.html", "favicon.svg", "assets/index-B0Jjxv7u.js", "assets/index-DkYftnLl.css"].join(
  "\n",
);

export function DeployPlanLab() {
  const [bucket, setBucket] = useState("aws-lab-site");
  const [distributionId, setDistributionId] = useState("E1A2B3C4D5E6F7");
  const [keepOldAssets, setKeepOldAssets] = useState(true);
  const [files, setFiles] = useState(DEFAULT_FILES);

  const plan = buildDeployPlan({ bucket, distributionId, keepOldAssets, files: files.split("\n") });

  return (
    <Lab title="把 dist/ 傳上 S3 並更新 CloudFront">
      <p className="lab-intro">
        預設清單取自本站某次 <code>npm run build</code> 產生的 <code>dist/</code>（hash 每次建置都會變）。改改看檔案或選項，看每個檔案該用什麼快取設定、指令要照什麼順序跑。
      </p>

      <div className="form-grid">
        <label className="field">
          <span>S3 bucket</span>
          <input id="deploy-bucket" type="text" value={bucket} onChange={(event) => setBucket(event.target.value)} />
        </label>
        <label className="field">
          <span>CloudFront distribution ID</span>
          <input
            id="deploy-distribution"
            type="text"
            value={distributionId}
            onChange={(event) => setDistributionId(event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>dist/ 裡的檔案（一行一個）</span>
          <textarea
            id="deploy-files"
            className="mono-input"
            rows={6}
            spellCheck={false}
            value={files}
            onChange={(event) => setFiles(event.target.value)}
          />
        </label>
        <label className="check field-wide">
          <input
            id="deploy-keep-old"
            type="checkbox"
            checked={keepOldAssets}
            onChange={(event) => setKeepOldAssets(event.target.checked)}
          />
          保留舊版 assets（已經開著舊版頁面的使用者，還能載入舊的 JS / CSS）
        </label>
      </div>

      {plan.warnings.map((warning) => (
        <p key={warning} className="lab-warn" role="status">
          {warning}
        </p>
      ))}

      <div className="table-wrap">
        <table className="calc">
          <thead>
            <tr>
              <th scope="col">檔案</th>
              <th scope="col">類型</th>
              <th scope="col">Cache-Control</th>
            </tr>
          </thead>
          <tbody>
            {plan.files.map((file) => (
              <tr key={file.path}>
                <th scope="row">
                  <code>{file.path}</code>
                </th>
                <td>
                  <span className={`pill kind-${file.kind}`}>{KIND_LABEL[file.kind]}</span>
                </td>
                <td>
                  <code>{file.cacheControl}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="deploy-steps">
        {plan.steps.map((step) => (
          <li key={step.title}>
            <h4>{step.title}</h4>
            <CodeBlock code={step.command} label="AWS CLI" />
          </li>
        ))}
      </ol>

      <p className="lab-note">
        這次要清 {plan.invalidationPaths.length} 個 invalidation 路徑。每個帳號每月前 1,000 個路徑免費；改用 <code>/*</code> 只算 1 個路徑，但會清掉整個網站的快取，包括不需要清的 hash 檔。
      </p>
    </Lab>
  );
}
