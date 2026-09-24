import { describe, expect, it } from "vitest";
import { reviewLambdaConfig, summarize, type LambdaConfig } from "./lambdaReview";

const risky: LambdaConfig = {
  timeoutSec: 3,
  memoryMb: 128,
  entry: "function-url",
  access: "public",
  reservedConcurrency: null,
  roleScope: "bedrock-all",
  guardrail: false,
};

const safe: LambdaConfig = {
  timeoutSec: 60,
  memoryMb: 512,
  entry: "function-url",
  access: "authenticated",
  reservedConcurrency: 20,
  roleScope: "minimal",
  guardrail: true,
};

const ids = (config: LambdaConfig) => reviewLambdaConfig(config).map((finding) => finding.id);

describe("reviewLambdaConfig", () => {
  it("預設值加公開網址會抓出主要風險，而且 danger 排最前面", () => {
    const findings = reviewLambdaConfig(risky);
    expect(findings[0].severity).toBe("danger");
    expect(ids(risky)).toEqual(expect.arrayContaining(["timeout-default", "public-unlimited", "public-guardrail", "role-broad"]));
  });

  it("安全設定沒有 danger 與 warn", () => {
    expect(summarize(reviewLambdaConfig(safe))).toEqual({ danger: 0, warn: 0, ok: 3 });
  });

  it("HTTP API 搭配超過 30 秒的 timeout 要提醒", () => {
    expect(ids({ ...safe, entry: "http-api", timeoutSec: 120 })).toContain("http-api-timeout");
    expect(ids({ ...safe, entry: "http-api", timeoutSec: 30 })).not.toContain("http-api-timeout");
  });

  it("超出範圍的數值與 reserved concurrency 0", () => {
    expect(ids({ ...safe, timeoutSec: 1200 })).toContain("timeout-range");
    expect(ids({ ...safe, memoryMb: 64 })).toContain("memory-range");
    expect(ids({ ...safe, reservedConcurrency: 0 })).toContain("concurrency-zero");
  });

  it("公開但有併發上限時降為 warn", () => {
    expect(ids({ ...safe, access: "public" })).toContain("public-limited");
    expect(ids({ ...safe, access: "public" })).not.toContain("public-unlimited");
  });

  it("管理員權限是 danger", () => {
    expect(reviewLambdaConfig({ ...safe, roleScope: "admin" })[0].id).toBe("role-admin");
  });
});
