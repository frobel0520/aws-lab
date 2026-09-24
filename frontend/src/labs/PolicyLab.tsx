import { useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Lab } from "../components/ui";
import {
  PRESET_POLICIES,
  SCENARIO_REQUESTS,
  evaluate,
  parsePolicy,
  type Decision,
  type NamedPolicy,
  type StatementMatch,
} from "../lib/iam";

const DECISION_LABEL: Record<Decision, string> = {
  allow: "允許",
  "explicit-deny": "明確拒絕",
  "implicit-deny": "預設拒絕",
};

const CUSTOM_DEFAULT = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:Get*",
      "Resource": "arn:aws:s3:::company-docs/*"
    }
  ]
}`;

function describe(match: StatementMatch): string {
  return match.sid ? `${match.policyName}（${match.sid}）` : match.policyName;
}

function DecisionBadge({ decision }: { decision: Decision }) {
  return <span className={`decision decision-${decision}`}>{DECISION_LABEL[decision]}</span>;
}

export function PolicyLab() {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(["basic-exec", "bedrock-min"]));
  const [customOn, setCustomOn] = useState(false);
  const [customText, setCustomText] = useState(CUSTOM_DEFAULT);
  const [selected, setSelected] = useState(SCENARIO_REQUESTS[0].id);

  const parsed = parsePolicy(customText);
  const policies: NamedPolicy[] = PRESET_POLICIES.filter((policy) => enabled.has(policy.id));
  if (customOn && parsed.ok) policies.push({ id: "custom", name: "自訂政策", document: parsed.document });

  const request = SCENARIO_REQUESTS.find((candidate) => candidate.id === selected) ?? SCENARIO_REQUESTS[0];
  const result = evaluate(policies, request);

  function toggle(id: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(id);
    else next.delete(id);
    setEnabled(next);
  }

  return (
    <Lab title="這個角色能做哪些事">
      <p className="lab-intro">
        情境：一個呼叫 Bedrock 的 Lambda，它的執行角色掛了哪些政策？勾選政策，看右邊每個請求的結果怎麼變；點一列可以看判斷過程。
      </p>

      <div className="policy-grid">
        <div className="policy-list">
          <h4>掛在角色上的政策</h4>
          {PRESET_POLICIES.map((policy) => (
            <div key={policy.id} className="policy-item">
              <label className="check">
                <input
                  id={`policy-${policy.id}`}
                  type="checkbox"
                  checked={enabled.has(policy.id)}
                  onChange={(event) => toggle(policy.id, event.target.checked)}
                />
                {policy.name}
              </label>
              <details>
                <summary>看 JSON</summary>
                <CodeBlock code={JSON.stringify(policy.document, null, 2)} label="identity-based policy" />
              </details>
            </div>
          ))}
          <div className="policy-item">
            <label className="check">
              <input id="policy-custom" type="checkbox" checked={customOn} onChange={(event) => setCustomOn(event.target.checked)} />
              自訂政策
            </label>
            {customOn ? (
              <>
                <textarea
                  id="policy-custom-text"
                  className="mono-input"
                  rows={10}
                  spellCheck={false}
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  aria-label="自訂政策 JSON"
                />
                {parsed.ok ? null : (
                  <p className="lab-warn" role="status">
                    {parsed.error} 修正前不會列入評估。
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>

        <div className="policy-result">
          <h4>請求與結果</h4>
          <div className="table-wrap">
            <table className="matrix">
              <tbody>
                {SCENARIO_REQUESTS.map((candidate) => {
                  const decision = evaluate(policies, candidate).decision;
                  return (
                    <tr key={candidate.id} className={candidate.id === selected ? "selected" : undefined}>
                      <th scope="row">
                        <button type="button" className="row-button" onClick={() => setSelected(candidate.id)}>
                          <span>{candidate.label}</span>
                          <code>{candidate.action}</code>
                        </button>
                      </th>
                      <td>
                        <DecisionBadge decision={decision} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="eval-steps" aria-live="polite">
            <p className="eval-request">
              <code>{request.action}</code>
              <span className="muted">on</span>
              <code>{request.resource}</code>
            </p>
            <ol>
              <li>
                有沒有明確 Deny？{" "}
                {result.denies.length > 0 ? <strong>有：{result.denies.map(describe).join("、")}</strong> : "沒有"}
              </li>
              <li>
                有沒有 Allow？{" "}
                {result.allows.length > 0 ? <strong>有：{result.allows.map(describe).join("、")}</strong> : "沒有"}
              </li>
              <li>
                結果：<DecisionBadge decision={result.decision} />
                {result.decision === "explicit-deny" && result.allows.length > 0 ? "（Deny 蓋過了 Allow）" : null}
              </li>
            </ol>
          </div>
        </div>
      </div>

      <p className="lab-foot">
        這個模擬器只處理單一帳號內身分型政策的 Effect、Action、Resource；Condition、資源型政策、SCP 與 permissions boundary 不在範圍內。
      </p>
    </Lab>
  );
}
