import { useState } from "react";
import { Lab } from "../components/ui";
import {
  reviewLambdaConfig,
  summarize,
  type Access,
  type Entry,
  type LambdaConfig,
  type RoleScope,
  type Severity,
} from "../lib/lambdaReview";

const INITIAL: LambdaConfig = {
  timeoutSec: 3,
  memoryMb: 128,
  entry: "function-url",
  access: "public",
  reservedConcurrency: null,
  roleScope: "bedrock-all",
  guardrail: false,
};

const RECOMMENDED: LambdaConfig = {
  timeoutSec: 60,
  memoryMb: 512,
  entry: "function-url",
  access: "authenticated",
  reservedConcurrency: 20,
  roleScope: "minimal",
  guardrail: true,
};

const SEVERITY_LABEL: Record<Severity, string> = { danger: "危險", warn: "注意", ok: "OK" };

function num(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function LambdaReviewLab() {
  const [config, setConfig] = useState<LambdaConfig>(INITIAL);
  const findings = reviewLambdaConfig(config);
  const counts = summarize(findings);
  const set = (patch: Partial<LambdaConfig>) => setConfig({ ...config, ...patch });

  return (
    <Lab title="這個 Lambda 可以上線了嗎">
      <p className="lab-intro">一開始是「剛建好函式、直接開一個公開網址」的狀態。調整設定，把危險項目清掉。</p>

      <div className="review-grid">
        <div className="form-grid form-compact">
          <label className="field">
            <span>timeout（秒）</span>
            <input
              id="lambda-timeout"
              type="number"
              min={1}
              max={900}
              value={config.timeoutSec}
              onChange={(event) => set({ timeoutSec: num(event.target.valueAsNumber, 0) })}
            />
          </label>
          <label className="field">
            <span>記憶體（MB）</span>
            <input
              id="lambda-memory"
              type="number"
              min={128}
              max={10240}
              step={64}
              value={config.memoryMb}
              onChange={(event) => set({ memoryMb: num(event.target.valueAsNumber, 0) })}
            />
          </label>
          <label className="field">
            <span>入口</span>
            <select id="lambda-entry" value={config.entry} onChange={(event) => set({ entry: event.target.value as Entry })}>
              <option value="function-url">Lambda function URL</option>
              <option value="http-api">API Gateway HTTP API</option>
            </select>
          </label>
          <label className="field">
            <span>存取控制</span>
            <select id="lambda-access" value={config.access} onChange={(event) => set({ access: event.target.value as Access })}>
              <option value="public">公開（任何人都能呼叫）</option>
              <option value="authenticated">需要驗證</option>
            </select>
          </label>
          <label className="field">
            <span>執行角色的權限</span>
            <select
              id="lambda-role"
              value={config.roleScope}
              onChange={(event) => set({ roleScope: event.target.value as RoleScope })}
            >
              <option value="minimal">只允許指定模型</option>
              <option value="bedrock-all">bedrock:* on *</option>
              <option value="admin">AdministratorAccess</option>
            </select>
          </label>
          <div className="field">
            <label className="check">
              <input
                id="lambda-reserved-on"
                type="checkbox"
                checked={config.reservedConcurrency !== null}
                onChange={(event) => set({ reservedConcurrency: event.target.checked ? 10 : null })}
              />
              設定 reserved concurrency
            </label>
            {config.reservedConcurrency !== null ? (
              <input
                id="lambda-reserved"
                type="number"
                min={0}
                aria-label="reserved concurrency"
                value={config.reservedConcurrency}
                onChange={(event) => set({ reservedConcurrency: num(event.target.valueAsNumber, 0) })}
              />
            ) : null}
          </div>
          <label className="check field-wide">
            <input
              id="lambda-guardrail"
              type="checkbox"
              checked={config.guardrail}
              onChange={(event) => set({ guardrail: event.target.checked })}
            />
            呼叫 Converse 時帶 guardrailConfig
          </label>
          <div className="lab-actions field-wide">
            <button type="button" onClick={() => setConfig(RECOMMENDED)}>
              套用建議設定
            </button>
            <button type="button" onClick={() => setConfig(INITIAL)}>
              回到初始狀態
            </button>
          </div>
        </div>

        <div className="findings">
          <p className="findings-summary" aria-live="polite">
            <span className="sev sev-danger">危險 {counts.danger}</span>
            <span className="sev sev-warn">注意 {counts.warn}</span>
            <span className="sev sev-ok">OK {counts.ok}</span>
          </p>
          <ul>
            {findings.map((finding) => (
              <li key={finding.id} className={`finding finding-${finding.severity}`}>
                <span className={`sev sev-${finding.severity}`}>{SEVERITY_LABEL[finding.severity]}</span>
                <div>
                  <strong>{finding.title}</strong>
                  <p>{finding.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Lab>
  );
}
