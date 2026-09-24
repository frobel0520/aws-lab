import { useState } from "react";
import { Lab } from "../components/ui";
import { costPerCall, formatUsd, monthlyCost, type UnitPrices, type Usage } from "../lib/cost";

const PRESETS: Record<"plain" | "cached", { label: string; usage: Usage }> = {
  plain: {
    label: "沒有快取",
    usage: { inputTokens: 2000, outputTokens: 500, cacheReadInputTokens: 0, cacheWriteInputTokens: 0 },
  },
  cached: {
    label: "長 system prompt 命中快取",
    usage: { inputTokens: 200, outputTokens: 500, cacheReadInputTokens: 1800, cacheWriteInputTokens: 0 },
  },
};

const USAGE_FIELDS: { key: keyof Usage; price: keyof UnitPrices; label: string }[] = [
  { key: "inputTokens", price: "input", label: "inputTokens（未命中快取）" },
  { key: "outputTokens", price: "output", label: "outputTokens" },
  { key: "cacheReadInputTokens", price: "cacheRead", label: "cacheReadInputTokens" },
  { key: "cacheWriteInputTokens", price: "cacheWrite", label: "cacheWriteInputTokens" },
];

function num(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function CostLab() {
  const [usage, setUsage] = useState<Usage>(PRESETS.plain.usage);
  const [prices, setPrices] = useState<UnitPrices>({ input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 });
  const [callsPerDay, setCallsPerDay] = useState(1000);

  const result = costPerCall(usage, prices);
  const perMonth = monthlyCost(result.total, callsPerDay);

  return (
    <Lab title="從 usage 算出這次呼叫花多少">
      <p className="lab-intro">
        填入回應裡的 <code>usage</code> 數字，以及該模型的單價。單價預設是<strong>範例值，不是 AWS 報價</strong>，請改成定價頁上該模型、該區域的實際單價。
      </p>

      <div className="preset-row">
        <span>套用情境：</span>
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
          <button key={key} type="button" onClick={() => setUsage(PRESETS[key].usage)}>
            {PRESETS[key].label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="calc">
          <thead>
            <tr>
              <th scope="col">usage 欄位</th>
              <th scope="col">token 數</th>
              <th scope="col">單價（USD / 1M）</th>
              <th scope="col" className="num">費用</th>
            </tr>
          </thead>
          <tbody>
            {USAGE_FIELDS.map((field) => (
              <tr key={field.key}>
                <th scope="row">
                  <code>{field.label}</code>
                </th>
                <td>
                  <input
                    id={`cost-${field.key}`}
                    aria-label={`${field.key} token 數`}
                    type="number"
                    min={0}
                    value={usage[field.key]}
                    onChange={(event) => setUsage({ ...usage, [field.key]: num(event.target.valueAsNumber) })}
                  />
                </td>
                <td>
                  <input
                    id={`price-${field.price}`}
                    aria-label={`${field.key} 單價`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={prices[field.price]}
                    onChange={(event) => setPrices({ ...prices, [field.price]: num(event.target.valueAsNumber) })}
                  />
                </td>
                <td className="num">{formatUsd(result[field.price])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="result-row">
        <div className="result">
          <span className="result-label">總輸入 token</span>
          <span className="result-value">{result.totalInputTokens.toLocaleString("en-US")}</span>
        </div>
        <div className="result">
          <span className="result-label">每次呼叫</span>
          <span className="result-value">{formatUsd(result.total)}</span>
        </div>
        <label className="result">
          <span className="result-label">每天呼叫次數</span>
          <input
            id="cost-calls-per-day"
            type="number"
            min={0}
            value={callsPerDay}
            onChange={(event) => setCallsPerDay(num(event.target.valueAsNumber))}
          />
        </label>
        <div className="result result-main">
          <span className="result-label">30 天估計</span>
          <span className="result-value">{formatUsd(perMonth)}</span>
        </div>
      </div>
      <p className="lab-foot">切換兩個情境比較看看：總輸入 token 一樣，命中快取的那部分改用較便宜的快取讀取單價計算。</p>
    </Lab>
  );
}
