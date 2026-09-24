import { CodeBlock } from "../components/CodeBlock";
import { External, PeerLink, Section } from "../components/ui";
import { ToolLoopLab } from "../labs/ToolLoopLab";
import { PEER_SITES } from "../sites";

const CODE = `tool_config = {
    "tools": [{
        "toolSpec": {
            "name": "get_stock",
            "description": "查詢料號目前的庫存數量與倉庫",
            "inputSchema": {"json": {
                "type": "object",
                "properties": {"part_no": {"type": "string"}},
                "required": ["part_no"],
            }},
        }
    }]
}

messages = [{"role": "user", "content": [{"text": "料號 SSD-1TB-A01 還有多少庫存？"}]}]
resp = client.converse(modelId=MODEL_ID, messages=messages, toolConfig=tool_config)

while resp["stopReason"] == "tool_use":
    assistant_msg = resp["output"]["message"]
    messages.append(assistant_msg)                  # 模型的 toolUse 訊息要原樣加回

    results = []
    for block in assistant_msg["content"]:
        if "toolUse" in block:
            tu = block["toolUse"]
            data = get_stock(**tu["input"])          # 你自己的函式
            results.append({"toolResult": {
                "toolUseId": tu["toolUseId"],
                "content": [{"json": data}],
            }})
    messages.append({"role": "user", "content": results})  # 所有結果放同一則訊息

    resp = client.converse(modelId=MODEL_ID, messages=messages, toolConfig=tool_config)

print(resp["output"]["message"]["content"][0]["text"])`;

export function ToolUseTopic() {
  return (
    <>
      <p className="lede">
        Tool use（function calling）讓模型可以「請你的程式去做事」。關鍵是：<strong>模型不會自己執行任何工具</strong>，它只告訴你要用哪個工具、參數是什麼，執行與權限都在你手上。
      </p>

      <ToolLoopLab />

      <Section title="完整程式">
        <CodeBlock code={CODE} label="Python · boto3" />
      </Section>

      <Section title="容易踩到的地方">
        <ul className="points">
          <li>
            <strong>assistant 的 toolUse 訊息要原樣加回 messages。</strong>少了它，下一輪的 toolResult 就對不到來源。
          </li>
          <li>
            <strong>多個 toolResult 放在同一則 user 訊息。</strong>模型一次可能要求多個工具，結果要全部收齊後一起送回。
          </li>
          <li>
            <strong>工具失敗也要回 toolResult。</strong>把錯誤訊息放進去（toolResult 可設 <code>status: "error"</code>），讓模型知道發生什麼事，而不是直接丟掉。
          </li>
          <li>
            <strong>toolChoice 控制模型要不要用工具。</strong>可設 auto（模型自己決定）、any（至少用一個）、tool（指定某個工具）；部分較新的模型不支援強制指定（any / tool），以模型文件為準。
          </li>
          <li>
            <strong>迴圈要有上限。</strong>正式環境要限制最多來回幾次，避免模型反覆呼叫工具。
          </li>
        </ul>
      </Section>

      <Section title="延伸學習">
        <PeerLink href={PEER_SITES.agent.url} site={PEER_SITES.agent.title}>
          用 LangChain、Dify 把 tool use 串成完整的 agent 流程
        </PeerLink>
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html">Tool use（function calling）官方文件</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
