// Converse tool use 來回流程的固定示範資料。不呼叫任何模型，同樣的輸入永遠得到同樣的 frames。

export type Actor = "app" | "model" | "tool";

export type ContentBlock =
  | { text: string }
  | { toolUse: { toolUseId: string; name: string; input: Record<string, unknown> } }
  | { toolResult: { toolUseId: string; content: Array<{ json: Record<string, unknown> }> } };

export interface ConverseMessage {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface LoopFrame {
  id: string;
  title: string;
  actor: Actor;
  explanation: string;
  payloadLabel: string;
  payload: unknown;
  /** 這一步結束後，你的程式手上的 messages。 */
  messages: ConverseMessage[];
  stopReason?: "tool_use" | "end_turn";
}

export const MODEL_ID = "anthropic.claude-sonnet-4-5-20250929-v1:0";
export const PART_NO = "SSD-1TB-A01";
export const TOOL_USE_ID = "tooluse_demo_01";

export const TOOL_CONFIG = {
  tools: [
    {
      toolSpec: {
        name: "get_stock",
        description: "查詢料號目前的庫存數量與倉庫",
        inputSchema: {
          json: {
            type: "object",
            properties: { part_no: { type: "string", description: "料號" } },
            required: ["part_no"],
          },
        },
      },
    },
  ],
};

const STOCK_RESULT = { part_no: PART_NO, qty: 1280, warehouse: "TW-01" };

export function buildToolLoopFrames(): LoopFrame[] {
  const userMessage: ConverseMessage = {
    role: "user",
    content: [{ text: `料號 ${PART_NO} 還有多少庫存？` }],
  };
  const toolUseMessage: ConverseMessage = {
    role: "assistant",
    content: [
      { text: "我來查一下庫存。" },
      { toolUse: { toolUseId: TOOL_USE_ID, name: "get_stock", input: { part_no: PART_NO } } },
    ],
  };
  const toolResultMessage: ConverseMessage = {
    role: "user",
    content: [{ toolResult: { toolUseId: TOOL_USE_ID, content: [{ json: STOCK_RESULT }] } }],
  };
  const finalMessage: ConverseMessage = {
    role: "assistant",
    content: [{ text: `料號 ${PART_NO} 目前在 TW-01 倉庫有 1,280 件庫存。` }],
  };

  return [
    {
      id: "request",
      title: "送出問題與工具定義",
      actor: "app",
      explanation:
        "你的程式呼叫 converse，除了 messages 之外，還用 toolConfig 告訴模型有哪些工具可以用、每個工具的輸入長什麼樣子（JSON Schema）。",
      payloadLabel: "client.converse(...) 參數",
      payload: { modelId: MODEL_ID, messages: [userMessage], toolConfig: TOOL_CONFIG },
      messages: [userMessage],
    },
    {
      id: "tool-use",
      title: "模型要求使用工具",
      actor: "model",
      explanation:
        "模型判斷需要查資料，回傳 stopReason = tool_use，content 裡有 toolUse：要用哪個工具、參數是什麼，以及一個 toolUseId。模型本身不會執行任何東西。",
      payloadLabel: "converse 回應",
      payload: { output: { message: toolUseMessage }, stopReason: "tool_use" },
      messages: [userMessage],
      stopReason: "tool_use",
    },
    {
      id: "run-tool",
      title: "你的程式執行工具",
      actor: "tool",
      explanation:
        "你的程式讀出 toolUse 的 name 與 input，呼叫自己的函式或內部 API（這裡是查庫存）。要不要執行、怎麼執行、權限怎麼管，都由你的程式決定。",
      payloadLabel: "get_stock(**input) 的結果",
      payload: { call: "get_stock", input: { part_no: PART_NO }, result: STOCK_RESULT },
      messages: [userMessage],
    },
    {
      id: "send-result",
      title: "把結果送回模型",
      actor: "app",
      explanation:
        "先把模型那則含 toolUse 的 assistant 訊息原樣加回 messages，再加一則 user 訊息放 toolResult，toolUseId 要對得上。有多個工具呼叫時，所有 toolResult 放在同一則 user 訊息。",
      payloadLabel: "client.converse(...) 參數",
      payload: {
        modelId: MODEL_ID,
        messages: [userMessage, toolUseMessage, toolResultMessage],
        toolConfig: TOOL_CONFIG,
      },
      messages: [userMessage, toolUseMessage, toolResultMessage],
    },
    {
      id: "final",
      title: "模型給出最終回答",
      actor: "model",
      explanation:
        "模型拿到工具結果後產生回答，stopReason = end_turn，迴圈結束。要繼續對話的話，把這則回答也加進 messages。",
      payloadLabel: "converse 回應",
      payload: { output: { message: finalMessage }, stopReason: "end_turn" },
      messages: [userMessage, toolUseMessage, toolResultMessage, finalMessage],
      stopReason: "end_turn",
    },
  ];
}
