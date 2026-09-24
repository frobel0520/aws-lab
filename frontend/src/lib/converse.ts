// 同一組對話輸入，分別組成 Converse 請求與各模型的 InvokeModel 原生 body。
// 原生格式依 AWS Bedrock 文件（Anthropic Claude Messages、Amazon Nova、Meta Llama 3）。

export type ModelFamily = "claude" | "nova" | "llama";

export interface ChatInput {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}

export interface ModelInfo {
  family: ModelFamily;
  label: string;
  vendor: string;
  /** 示意用；實際可用的 model ID 依區域與帳號開通狀態而定。 */
  modelId: string;
  nativeNote: string;
}

export const MODELS: readonly ModelInfo[] = [
  {
    family: "claude",
    label: "Claude Sonnet 4.5",
    vendor: "Anthropic",
    modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
    nativeNote:
      "Anthropic Messages 格式：欄位是 snake_case，必須帶 anthropic_version，system 是字串，content block 要寫 type。",
  },
  {
    family: "nova",
    label: "Nova Pro",
    vendor: "Amazon",
    modelId: "amazon.nova-pro-v1:0",
    nativeNote:
      "Nova 的原生格式本來就照 Converse 設計，幾乎一模一樣，只多了 schemaVersion。這也說明了 Converse 的 schema 是 AWS 自己定的。",
  },
  {
    family: "llama",
    label: "Llama 3 70B Instruct",
    vendor: "Meta",
    modelId: "meta.llama3-70b-instruct-v1:0",
    nativeNote:
      "Llama 沒有 messages 結構，整段對話要自己套特殊 token 模板組成一個 prompt 字串；長度參數叫 max_gen_len。",
  },
];

export function getModel(family: ModelFamily): ModelInfo {
  const model = MODELS.find((candidate) => candidate.family === family);
  if (!model) throw new Error(`Unknown model family: ${family}`);
  return model;
}

function hasSystem(input: ChatInput): boolean {
  return input.system.trim() !== "";
}

/** client.converse(**request) 的參數。不論哪個模型，只有 modelId 會不同。 */
export function buildConverseRequest(family: ModelFamily, input: ChatInput): Record<string, unknown> {
  return {
    modelId: getModel(family).modelId,
    ...(hasSystem(input) ? { system: [{ text: input.system }] } : {}),
    messages: [{ role: "user", content: [{ text: input.user }] }],
    inferenceConfig: { maxTokens: input.maxTokens, temperature: input.temperature },
  };
}

export function formatLlama3Prompt(system: string, user: string): string {
  let prompt = "<|begin_of_text|>";
  if (system.trim() !== "") {
    prompt += `<|start_header_id|>system<|end_header_id|>\n\n${system}<|eot_id|>`;
  }
  prompt += `<|start_header_id|>user<|end_header_id|>\n\n${user}<|eot_id|>`;
  prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n";
  return prompt;
}

/** client.invoke_model(modelId=..., body=json.dumps(body)) 裡的 body。每個模型都不一樣。 */
export function buildInvokeModelBody(family: ModelFamily, input: ChatInput): Record<string, unknown> {
  switch (family) {
    case "claude":
      return {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: input.maxTokens,
        ...(hasSystem(input) ? { system: input.system } : {}),
        messages: [{ role: "user", content: [{ type: "text", text: input.user }] }],
        temperature: input.temperature,
      };
    case "nova":
      return {
        schemaVersion: "messages-v1",
        ...(hasSystem(input) ? { system: [{ text: input.system }] } : {}),
        messages: [{ role: "user", content: [{ text: input.user }] }],
        inferenceConfig: { maxTokens: input.maxTokens, temperature: input.temperature },
      };
    case "llama":
      return {
        prompt: formatLlama3Prompt(input.system, input.user),
        max_gen_len: input.maxTokens,
        temperature: input.temperature,
      };
  }
}

/** 輸入超出該模型原生參數範圍時的提醒（依 AWS 文件列出的上限）。 */
export function nativeWarnings(family: ModelFamily, input: ChatInput): string[] {
  const warnings: string[] = [];
  if (family === "llama" && input.maxTokens > 2048) {
    warnings.push("Llama 3 的 max_gen_len 上限是 2048。");
  }
  if (family === "nova" && input.maxTokens > 5000) {
    warnings.push("Nova（v1）的 maxTokens 上限是 5K。");
  }
  if (input.temperature < 0 || input.temperature > 1) {
    warnings.push("這三個模型的 temperature 都介於 0 到 1。");
  }
  return warnings;
}
