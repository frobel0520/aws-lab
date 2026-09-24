import { useState } from "react";
import { JsonBlock } from "../components/CodeBlock";
import { Lab } from "../components/ui";
import { checkTrust, patternWarnings, trustPolicy, type TriggerKind } from "../lib/oidc";

const REPO = "frobel0520/aws-lab";

const SCENARIOS: { id: string; label: string; kind: TriggerKind; name: string }[] = [
  { id: "main", label: "push 到 main", kind: "branch", name: "main" },
  { id: "feature", label: "push 到 feature 分支", kind: "branch", name: "feature/iam-lab" },
  { id: "pr", label: "開 pull request", kind: "pull_request", name: "" },
  { id: "tag", label: "發 tag v1.0.0", kind: "tag", name: "v1.0.0" },
  { id: "env", label: "job 使用 production environment", kind: "environment", name: "production" },
];

const KIND_LABEL: Record<TriggerKind, string> = {
  branch: "分支",
  tag: "tag",
  pull_request: "pull request",
  environment: "environment",
};

export function OidcLab() {
  const [repo, setRepo] = useState(REPO);
  const [kind, setKind] = useState<TriggerKind>("branch");
  const [name, setName] = useState("main");
  const [patterns, setPatterns] = useState(`repo:${REPO}:ref:refs/heads/main`);

  const patternList = patterns.split("\n");
  const result = checkTrust({ repo, kind, name }, patternList);
  const warnings = patternList.flatMap((pattern) =>
    patternWarnings(pattern).map((warning) => ({ ...warning, pattern: pattern.trim() })),
  );

  return (
    <Lab title="這個 workflow 能 assume 部署角色嗎">
      <p className="lab-intro">
        角色的 trust policy 用 <code>sub</code> 條件決定哪些 workflow 可以換到憑證。挑一個觸發情境，看 GitHub 發出的 <code>sub</code> 長什麼樣子、有沒有對上條件。
      </p>

      <div className="preset-row">
        <span>情境：</span>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => {
              setKind(scenario.kind);
              setName(scenario.name);
            }}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label className="field">
          <span>repo（owner/name）</span>
          <input id="oidc-repo" type="text" value={repo} onChange={(event) => setRepo(event.target.value)} />
        </label>
        <div className="field-pair">
          <label className="field">
            <span>觸發方式</span>
            <select id="oidc-kind" value={kind} onChange={(event) => setKind(event.target.value as TriggerKind)}>
              {(Object.keys(KIND_LABEL) as TriggerKind[]).map((value) => (
                <option key={value} value={value}>
                  {KIND_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>名稱</span>
            <input
              id="oidc-name"
              type="text"
              value={kind === "pull_request" ? "" : name}
              disabled={kind === "pull_request"}
              placeholder={kind === "pull_request" ? "不需要" : ""}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <label className="field field-wide">
          <span>trust policy 允許的 sub（一行一個，StringLike，可用 * 與 ?）</span>
          <textarea
            id="oidc-patterns"
            className="mono-input"
            rows={3}
            spellCheck={false}
            value={patterns}
            onChange={(event) => setPatterns(event.target.value)}
          />
        </label>
      </div>

      <div className={`verdict ${result.allowed ? "verdict-allow" : "verdict-deny"}`} aria-live="polite">
        <span className="verdict-label">token 的 sub</span>
        <code>{result.sub}</code>
        <strong>
          {result.allowed ? `可以 assume：對上「${result.matchedPattern}」` : "AssumeRoleWithWebIdentity 會被拒絕：沒有任何條件對得上"}
        </strong>
      </div>

      {warnings.map((warning) => (
        <p key={`${warning.pattern}-${warning.message}`} className={warning.level === "danger" ? "lab-warn" : "lab-note lab-note-amber"}>
          <code>{warning.pattern}</code>：{warning.message}
        </p>
      ))}

      <JsonBlock label="對應的 trust policy" value={trustPolicy("123456789012", patternList)} />
      <p className="lab-foot">aud 條件固定比對 sts.amazonaws.com，這是官方 configure-aws-credentials action 使用的值。</p>
    </Lab>
  );
}
