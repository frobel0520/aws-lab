import { useState } from "react";
import { Lab } from "../components/ui";
import { formatUsd, guardrailCostPerCall, monthlyCost, textUnits } from "../lib/cost";

interface PolicyRow {
  id: string;
  label: string;
  free: boolean;
  enabled: boolean;
  price: number;
}

// 單價來源：AWS Bedrock 定價頁 Guardrails 段落（2026-09 查閱，Standard / Classic tier）。
const INITIAL_POLICIES: PolicyRow[] = [
  { id: "content", label: "內容過濾（文字）", free: false, enabled: true, price: 0.15 },
  { id: "topics", label: "禁止主題", free: false, enabled: false, price: 0.15 },
  { id: "pii", label: "敏感資訊（模型偵測）", free: false, enabled: true, price: 0.1 },
  { id: "grounding", label: "事實依據檢查", free: false, enabled: false, price: 0.1 },
  { id: "words", label: "字詞過濾", free: true, enabled: true, price: 0 },
  { id: "regex", label: "敏感資訊（regex）", free: true, enabled: false, price: 0 },
];

function num(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function GuardrailCostLab() {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [inputChars, setInputChars] = useState(1200);
  const [outputChars, setOutputChars] = useState(2500);
  const [checkInput, setCheckInput] = useState(true);
  const [checkOutput, setCheckOutput] = useState(true);
  const [callsPerDay, setCallsPerDay] = useState(1000);

  const { units, cost } = guardrailCostPerCall({
    inputChars,
    outputChars,
    checkInput,
    checkOutput,
    policies: policies.map((policy) => ({ enabled: policy.enabled, pricePer1kUnits: policy.price })),
  });

  function update(id: string, patch: Partial<PolicyRow>) {
    setPolicies(policies.map((policy) => (policy.id === id ? { ...policy, ...patch } : policy)));
  }

  return (
    <Lab title="開了 Guardrails，每次呼叫多付多少">
      <p className="lab-intro">
        Guardrails 以 <strong>text unit</strong> 計費：每 1,000 個字元算一個單位，超過就無條件進位。輸入與輸出分別檢查、分別計算，每個啟用的政策各收一次。
      </p>

      <div className="form-grid">
        <label className="field">
          <span>輸入字元數</span>
          <input
            id="gr-input-chars"
            type="number"
            min={0}
            value={inputChars}
            onChange={(event) => setInputChars(num(event.target.valueAsNumber))}
          />
          <small>= {textUnits(inputChars)} 個 text unit</small>
        </label>
        <label className="field">
          <span>輸出字元數</span>
          <input
            id="gr-output-chars"
            type="number"
            min={0}
            value={outputChars}
            onChange={(event) => setOutputChars(num(event.target.valueAsNumber))}
          />
          <small>= {textUnits(outputChars)} 個 text unit</small>
        </label>
        <label className="check">
          <input id="gr-check-input" type="checkbox" checked={checkInput} onChange={(event) => setCheckInput(event.target.checked)} />
          檢查輸入
        </label>
        <label className="check">
          <input id="gr-check-output" type="checkbox" checked={checkOutput} onChange={(event) => setCheckOutput(event.target.checked)} />
          檢查輸出
        </label>
      </div>

      <div className="table-wrap">
        <table className="calc">
          <thead>
            <tr>
              <th scope="col">政策</th>
              <th scope="col">啟用</th>
              <th scope="col">USD / 1,000 text units</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <th scope="row">
                  {policy.label}
                  {policy.free ? <span className="pill pill-free">免費</span> : null}
                </th>
                <td>
                  <input
                    id={`gr-policy-${policy.id}`}
                    type="checkbox"
                    aria-label={`啟用${policy.label}`}
                    checked={policy.enabled}
                    onChange={(event) => update(policy.id, { enabled: event.target.checked })}
                  />
                </td>
                <td>
                  {policy.free ? (
                    <span className="muted">0</span>
                  ) : (
                    <input
                      id={`gr-price-${policy.id}`}
                      aria-label={`${policy.label}單價`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={policy.price}
                      onChange={(event) => update(policy.id, { price: num(event.target.valueAsNumber) })}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="result-row">
        <div className="result">
          <span className="result-label">每次計費單位</span>
          <span className="result-value">{units}</span>
        </div>
        <div className="result">
          <span className="result-label">每次呼叫</span>
          <span className="result-value">{formatUsd(cost)}</span>
        </div>
        <label className="result">
          <span className="result-label">每天呼叫次數</span>
          <input
            id="gr-calls-per-day"
            type="number"
            min={0}
            value={callsPerDay}
            onChange={(event) => setCallsPerDay(num(event.target.valueAsNumber))}
          />
        </label>
        <div className="result result-main">
          <span className="result-label">30 天估計</span>
          <span className="result-value">{formatUsd(monthlyCost(cost, callsPerDay))}</span>
        </div>
      </div>
      <p className="lab-foot">
        預設單價取自 2026 年 9 月的 AWS 定價頁（Standard / Classic tier），價格可能變動，以官方為準。這裡只算 Guardrails 本身，模型的 token 費用另計。自動推理檢查按政策數計價，這裡沒有列入。
      </p>
    </Lab>
  );
}
