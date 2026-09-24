import { describe, expect, it } from "vitest";
import { costPerCall, formatUsd, guardrailCostPerCall, monthlyCost, textUnits } from "./cost";

const prices = { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 };

describe("costPerCall", () => {
  it("各欄位分開計價後加總", () => {
    const result = costPerCall(
      { inputTokens: 1_000_000, outputTokens: 200_000, cacheReadInputTokens: 500_000, cacheWriteInputTokens: 0 },
      prices,
    );
    expect(result.input).toBeCloseTo(1);
    expect(result.output).toBeCloseTo(1);
    expect(result.cacheRead).toBeCloseTo(0.05);
    expect(result.total).toBeCloseTo(2.05);
  });

  it("總輸入 token = inputTokens + 快取讀取 + 快取寫入", () => {
    const result = costPerCall(
      { inputTokens: 100, outputTokens: 0, cacheReadInputTokens: 2000, cacheWriteInputTokens: 300 },
      prices,
    );
    expect(result.totalInputTokens).toBe(2400);
  });

  it("負數與 NaN 視為 0", () => {
    const result = costPerCall(
      { inputTokens: -5, outputTokens: Number.NaN, cacheReadInputTokens: 0, cacheWriteInputTokens: 0 },
      prices,
    );
    expect(result.total).toBe(0);
  });
});

describe("monthlyCost", () => {
  it("每次費用 × 每日次數 × 天數", () => {
    expect(monthlyCost(0.002, 1000)).toBeCloseTo(60);
    expect(monthlyCost(0.002, 1000, 22)).toBeCloseTo(44);
  });
});

describe("formatUsd", () => {
  it("小額保留有效位數，一般金額兩位小數", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.0045)).toBe("$0.0045");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });
});

describe("textUnits", () => {
  it("每 1,000 字元一個單位，無條件進位", () => {
    expect(textUnits(0)).toBe(0);
    expect(textUnits(1)).toBe(1);
    expect(textUnits(1000)).toBe(1);
    expect(textUnits(1001)).toBe(2);
  });
});

describe("guardrailCostPerCall", () => {
  it("輸入與輸出分別計單位，只算啟用的政策", () => {
    const result = guardrailCostPerCall({
      inputChars: 1500,
      outputChars: 800,
      checkInput: true,
      checkOutput: true,
      policies: [
        { enabled: true, pricePer1kUnits: 0.15 },
        { enabled: false, pricePer1kUnits: 0.15 },
        { enabled: true, pricePer1kUnits: 0 },
      ],
    });
    expect(result.units).toBe(3);
    expect(result.cost).toBeCloseTo(0.00045);
  });

  it("不檢查輸出時，輸出字數不計", () => {
    const result = guardrailCostPerCall({
      inputChars: 500,
      outputChars: 5000,
      checkInput: true,
      checkOutput: false,
      policies: [{ enabled: true, pricePer1kUnits: 0.1 }],
    });
    expect(result.units).toBe(1);
  });
});
