import { describe, expect, it } from "vitest";
import {
  PRESET_POLICIES,
  SCENARIO_REQUESTS,
  evaluate,
  parsePolicy,
  wildcardMatch,
  type NamedPolicy,
} from "./iam";

const preset = (...ids: string[]): NamedPolicy[] => PRESET_POLICIES.filter((policy) => ids.includes(policy.id));
const request = (id: string) => {
  const found = SCENARIO_REQUESTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing request ${id}`);
  return found;
};

describe("wildcardMatch", () => {
  it("* 比對任意長度，? 比對單一字元", () => {
    expect(wildcardMatch("s3:Get*", "s3:GetObject")).toBe(true);
    expect(wildcardMatch("s3:Get*", "s3:PutObject")).toBe(false);
    expect(wildcardMatch("logs:Put?ogEvents", "logs:PutLogEvents")).toBe(true);
    expect(wildcardMatch("arn:aws:s3:::bucket.name/*", "arn:aws:s3:::bucketXname/a")).toBe(false);
  });

  it("可選擇不分大小寫", () => {
    expect(wildcardMatch("S3:getobject", "s3:GetObject", true)).toBe(true);
    expect(wildcardMatch("S3:getobject", "s3:GetObject")).toBe(false);
  });
});

describe("evaluate", () => {
  it("沒有任何政策時預設拒絕", () => {
    expect(evaluate([], request("converse")).decision).toBe("implicit-deny");
  });

  it("最小權限只放行指定模型的兩種呼叫", () => {
    const policies = preset("bedrock-min");
    expect(evaluate(policies, request("converse")).decision).toBe("allow");
    expect(evaluate(policies, request("converse-stream")).decision).toBe("allow");
    expect(evaluate(policies, request("nova")).decision).toBe("implicit-deny");
  });

  it("過寬的權限會放行其他模型", () => {
    expect(evaluate(preset("bedrock-all"), request("nova")).decision).toBe("allow");
  });

  it("明確 Deny 蓋過其他政策的 Allow", () => {
    const allowDelete: NamedPolicy = {
      id: "allow-all-s3",
      name: "s3 全開",
      document: { Statement: { Effect: "Allow", Action: "s3:*", Resource: "*" } },
    };
    const result = evaluate([allowDelete, ...preset("deny-delete")], request("delete-doc"));
    expect(result.decision).toBe("explicit-deny");
    expect(result.allows).toHaveLength(1);
    expect(result.denies[0].sid).toBe("NoDelete");
  });

  it("Action 不分大小寫", () => {
    const policy: NamedPolicy = {
      id: "p",
      name: "p",
      document: { Statement: { Effect: "Allow", Action: "LOGS:putlogevents", Resource: "*" } },
    };
    expect(evaluate([policy], request("write-log")).decision).toBe("allow");
  });
});

describe("parsePolicy", () => {
  it("接受合法政策，Statement 可以是單一物件", () => {
    const result = parsePolicy('{"Statement":{"Effect":"Allow","Action":"s3:Get*","Resource":"*"}}');
    expect(result.ok).toBe(true);
  });

  it("拒絕壞掉的 JSON 與缺欄位", () => {
    expect(parsePolicy("{").ok).toBe(false);
    expect(parsePolicy('{"Statement":[]}').ok).toBe(false);
    expect(parsePolicy('{"Statement":[{"Effect":"allow","Action":"s3:*","Resource":"*"}]}').ok).toBe(false);
    expect(parsePolicy('{"Statement":[{"Effect":"Allow","Resource":"*"}]}').ok).toBe(false);
  });

  it("明確拒絕模擬器不支援的元素", () => {
    const result = parsePolicy(
      '{"Statement":[{"Effect":"Allow","Action":"s3:*","Resource":"*","Condition":{"Bool":{"aws:SecureTransport":"true"}}}]}',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Condition");
  });
});
