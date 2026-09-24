import { describe, expect, it } from "vitest";
import {
  MODELS,
  buildConverseRequest,
  buildInvokeModelBody,
  formatLlama3Prompt,
  nativeWarnings,
  type ChatInput,
} from "./converse";

const input: ChatInput = {
  system: "你是精簡的技術助理。",
  user: "用三句話解釋 SSD 的 TBW",
  maxTokens: 512,
  temperature: 0.3,
};

describe("buildConverseRequest", () => {
  it("只有 modelId 會隨模型改變", () => {
    const [first, ...rest] = MODELS.map((model) => buildConverseRequest(model.family, input));
    const { modelId: _firstId, ...firstShape } = first;
    for (const request of rest) {
      const { modelId, ...shape } = request;
      expect(modelId).not.toBe(first.modelId);
      expect(shape).toEqual(firstShape);
    }
  });

  it("system 空白時不帶 system 欄位", () => {
    const request = buildConverseRequest("claude", { ...input, system: "  " });
    expect(request).not.toHaveProperty("system");
  });
});

describe("buildInvokeModelBody", () => {
  it("Claude 需要 anthropic_version，system 是字串", () => {
    const body = buildInvokeModelBody("claude", input);
    expect(body.anthropic_version).toBe("bedrock-2023-05-31");
    expect(body.system).toBe(input.system);
    expect(body.max_tokens).toBe(512);
  });

  it("Nova 與 Converse 幾乎相同，只多 schemaVersion", () => {
    const body = buildInvokeModelBody("nova", input);
    const { modelId: _id, ...converse } = buildConverseRequest("nova", input);
    const { schemaVersion, ...rest } = body;
    expect(schemaVersion).toBe("messages-v1");
    expect(rest).toEqual(converse);
  });

  it("Llama 用單一 prompt 字串與 max_gen_len", () => {
    const body = buildInvokeModelBody("llama", input);
    expect(body).not.toHaveProperty("messages");
    expect(body.max_gen_len).toBe(512);
    expect(body.prompt).toBe(formatLlama3Prompt(input.system, input.user));
  });

  it("三個模型的原生 body 彼此不同", () => {
    const bodies = MODELS.map((model) => JSON.stringify(buildInvokeModelBody(model.family, input)));
    expect(new Set(bodies).size).toBe(MODELS.length);
  });
});

describe("formatLlama3Prompt", () => {
  it("依模板排列並以 assistant header 結尾", () => {
    expect(formatLlama3Prompt("S", "U")).toBe(
      "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nS<|eot_id|>" +
        "<|start_header_id|>user<|end_header_id|>\n\nU<|eot_id|>" +
        "<|start_header_id|>assistant<|end_header_id|>\n\n",
    );
  });

  it("沒有 system 時省略 system 區段", () => {
    expect(formatLlama3Prompt("", "U")).not.toContain("system");
  });
});

describe("nativeWarnings", () => {
  it("超過上限時提醒", () => {
    expect(nativeWarnings("llama", { ...input, maxTokens: 4096 })).toHaveLength(1);
    expect(nativeWarnings("nova", { ...input, maxTokens: 8000 })).toHaveLength(1);
    expect(nativeWarnings("claude", { ...input, temperature: 1.5 })).toHaveLength(1);
  });

  it("範圍內不提醒", () => {
    for (const model of MODELS) expect(nativeWarnings(model.family, input)).toEqual([]);
  });
});
