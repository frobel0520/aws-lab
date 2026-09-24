// Token 與 Guardrails 費用試算。單價由使用者輸入，本站不內建任何模型報價。

export interface Usage {
  /** 未命中快取的輸入 token（Converse 開啟快取時，inputTokens 不含快取部分）。 */
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheWriteInputTokens: number;
}

/** 單位：USD / 每 100 萬 token。 */
export interface UnitPrices {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface CostBreakdown {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  /** inputTokens + cacheReadInputTokens + cacheWriteInputTokens */
  totalInputTokens: number;
}

function clean(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function perMillion(tokens: number, price: number): number {
  return (clean(tokens) * clean(price)) / 1_000_000;
}

export function costPerCall(usage: Usage, prices: UnitPrices): CostBreakdown {
  const input = perMillion(usage.inputTokens, prices.input);
  const output = perMillion(usage.outputTokens, prices.output);
  const cacheRead = perMillion(usage.cacheReadInputTokens, prices.cacheRead);
  const cacheWrite = perMillion(usage.cacheWriteInputTokens, prices.cacheWrite);
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    total: input + output + cacheRead + cacheWrite,
    totalInputTokens:
      clean(usage.inputTokens) + clean(usage.cacheReadInputTokens) + clean(usage.cacheWriteInputTokens),
  };
}

export function monthlyCost(perCall: number, callsPerDay: number, days = 30): number {
  return clean(perCall) * clean(callsPerDay) * days;
}

export function formatUsd(value: number): string {
  const amount = clean(value);
  if (amount === 0) return "$0";
  if (amount < 0.01) return `$${amount.toPrecision(2)}`;
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------- Guardrails ----------

/** AWS 定價頁：一個 text unit 最多 1,000 個字元。 */
export const TEXT_UNIT_CHARS = 1000;

export function textUnits(chars: number): number {
  const count = clean(chars);
  return count === 0 ? 0 : Math.ceil(count / TEXT_UNIT_CHARS);
}

export interface GuardrailPolicyInput {
  enabled: boolean;
  /** USD / 每 1,000 text units；免費政策填 0。 */
  pricePer1kUnits: number;
}

export interface GuardrailCallInput {
  inputChars: number;
  outputChars: number;
  checkInput: boolean;
  checkOutput: boolean;
  policies: GuardrailPolicyInput[];
}

export function guardrailCostPerCall(call: GuardrailCallInput): { units: number; cost: number } {
  const units =
    (call.checkInput ? textUnits(call.inputChars) : 0) + (call.checkOutput ? textUnits(call.outputChars) : 0);
  const pricePer1k = call.policies
    .filter((policy) => policy.enabled)
    .reduce((sum, policy) => sum + clean(policy.pricePer1kUnits), 0);
  return { units, cost: (units * pricePer1k) / 1000 };
}
