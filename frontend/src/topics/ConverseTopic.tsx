import { useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { External, Note, Section, Table } from "../components/ui";
import { FormatLab } from "../labs/FormatLab";

const BASIC = `import boto3

client = boto3.client("bedrock-runtime", region_name="us-east-1")

resp = client.converse(
    modelId="us.anthropic.claude-sonnet-4-5-20250929-v1:0",  # 換成 "us.amazon.nova-pro-v1:0" 也能跑
    system=[{"text": "你是精簡的技術助理，用繁體中文回答。"}],
    messages=[
        {"role": "user", "content": [{"text": "用三句話解釋 SSD 的 TBW"}]},
    ],
    inferenceConfig={"maxTokens": 512, "temperature": 0.3},
)

print(resp["output"]["message"]["content"][0]["text"])
print(resp["stopReason"], resp["usage"])`;

const STREAM = `resp = client.converse_stream(
    modelId="us.amazon.nova-pro-v1:0",
    messages=[{"role": "user", "content": [{"text": "寫一段 SSD 產品簡介"}]}],
)

for event in resp["stream"]:
    if "contentBlockDelta" in event:
        print(event["contentBlockDelta"]["delta"].get("text", ""), end="", flush=True)
    elif "messageStop" in event:
        print("\\n[stop]", event["messageStop"]["stopReason"])
    elif "metadata" in event:
        print("[usage]", event["metadata"]["usage"])`;

const RESPONSE = `{
  "output": {
    "message": {
      "role": "assistant",
      "content": [{"text": "…模型產生的文字…"}]
    }
  },
  "stopReason": "end_turn",   // 或 tool_use、max_tokens、stop_sequence、guardrail_intervened…
  "usage": {"inputTokens": 30, "outputTokens": 628, "totalTokens": 658},
  "metrics": {"latencyMs": 1275}
}`;

const EXAMPLES = [
  { id: "basic", label: "基本呼叫", code: BASIC, note: "標註註解的那一行是換模型時唯一要改的地方。" },
  { id: "stream", label: "串流", code: STREAM, note: "參數跟 converse 完全相同，差別在回傳的是事件串流。" },
  { id: "response", label: "回應格式", code: RESPONSE, note: "不管背後是哪個模型，回應都是這個形狀。" },
];

function Examples() {
  const [active, setActive] = useState(EXAMPLES[0].id);
  const example = EXAMPLES.find((candidate) => candidate.id === active) ?? EXAMPLES[0];
  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label="程式範例">
        {EXAMPLES.map((candidate) => (
          <button
            key={candidate.id}
            id={`tab-${candidate.id}`}
            role="tab"
            type="button"
            aria-selected={candidate.id === active}
            aria-controls="converse-example-panel"
            onClick={() => setActive(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <div id="converse-example-panel" role="tabpanel" aria-labelledby={`tab-${example.id}`} className="tabpanel">
        <p className="muted">{example.note}</p>
        <CodeBlock code={example.code} label={example.id === "response" ? "JSON" : "Python · boto3"} />
      </div>
    </div>
  );
}

export function ConverseTopic() {
  return (
    <>
      <p className="lede">
        一套請求格式，呼叫 Bedrock 上所有支援對話（messages）的模型。<strong>換模型，通常只要換 <code>modelId</code>。</strong>
      </p>
      <div className="facts">
        <span>
          端點 <code>POST /model/{"{modelId}"}/converse</code>
        </span>
        <span>
          操作 <code>Converse</code> / <code>ConverseStream</code>
        </span>
        <span>
          IAM 權限 <code>bedrock:InvokeModel</code>
        </span>
      </div>

      <Section title="它解決什麼問題">
        <p>
          早期在 Bedrock 呼叫模型用的是 <code>InvokeModel</code>：request body 直接是各家模型的原生格式。Claude、Llama、Nova 各有各的欄位名稱、prompt 結構與回應格式，想比較或切換模型，就得各寫一套組裝與解析程式。
        </p>
        <p>Converse 在中間加了一層統一的 schema：訊息、system prompt、推論參數、工具定義、回應格式都長一樣，由 Bedrock 轉成各模型的原生格式。</p>

        <div className="flow" role="img" aria-label="你的程式呼叫 Converse 統一格式，由 Bedrock 轉給各家模型；模型特有參數透過 additionalModelRequestFields 直通">
          <div className="node">
            <span className="node-label">你的程式</span>
            <ul>
              <li>client.converse(...)</li>
              <li>client.converse_stream(...)</li>
            </ul>
          </div>
          <div className="arrow" aria-hidden="true">
            →
          </div>
          <div className="node node-core">
            <span className="node-label">Converse 統一格式</span>
            <ul>
              <li>messages / system</li>
              <li>inferenceConfig</li>
              <li>toolConfig</li>
              <li>guardrailConfig</li>
              <li>outputConfig</li>
            </ul>
          </div>
          <div className="arrow" aria-hidden="true">
            →
          </div>
          <div className="node">
            <span className="node-label">Bedrock 上的模型</span>
            <ul className="plain">
              <li>Anthropic Claude</li>
              <li>Amazon Nova</li>
              <li>Meta Llama</li>
              <li>Mistral、DeepSeek 等</li>
            </ul>
          </div>
          <div className="bypass">
            通用欄位沒涵蓋的模型原生參數（例如 <code>top_k</code>）→ 放進 <code>additionalModelRequestFields</code>，原樣直通給模型。
          </div>
        </div>
      </Section>

      <FormatLab />

      <Section title="可以做到的事">
        <div className="groups">
          <div className="group">
            <h3>對話核心</h3>
            <dl>
              <dt>messages / system</dt>
              <dd>多輪對話，role 為 user / assistant；system prompt 獨立一個欄位。對話歷史由你自己保存並每次帶上。</dd>
              <dt>inferenceConfig</dt>
              <dd>通用推論參數：maxTokens、temperature、topP、stopSequences。</dd>
              <dt>ConverseStream</dt>
              <dd>同樣的請求格式，改成逐段回傳；事件包含 contentBlockDelta、messageStop、metadata（含 token 用量）。</dd>
            </dl>
          </div>
          <div className="group">
            <h3>多模態輸入</h3>
            <dl>
              <dt>image / document</dt>
              <dd>圖片與文件（PDF、Word、Excel、CSV、HTML、Markdown 等）直接當作 content block 放進訊息。</dd>
              <dt>video / audio</dt>
              <dd>影片、音訊輸入，只有部分模型支援（例如 Amazon Nova）。</dd>
              <dt>searchResult</dt>
              <dd>把自己的檢索結果以結構化區塊傳入，方便做 RAG 與引用來源。</dd>
            </dl>
          </div>
          <div className="group">
            <h3>工具與輸出控制</h3>
            <dl>
              <dt>toolConfig</dt>
              <dd>
                用 JSON Schema 定義工具。模型回傳 toolUse，你執行後回 toolResult。細節見 <a href="#/tool-use">Tool use 迴圈</a>。
              </dd>
              <dt>outputConfig</dt>
              <dd>以 json_schema 限制模型的輸出結構（structured output）。</dd>
              <dt>reasoningContent / citationsContent</dt>
              <dd>模型支援時，可以拿到推理內容與引用來源。</dd>
            </dl>
          </div>
          <div className="group">
            <h3>治理、成本與維運</h3>
            <dl>
              <dt>guardrailConfig</dt>
              <dd>
                套用 Bedrock Guardrails 過濾輸入與輸出，見 <a href="#/guardrails">Bedrock Guardrails</a>。
              </dd>
              <dt>cachePoint</dt>
              <dd>在 tools、system 或 messages 中標記快取點，重複的長 prompt 前綴可降低成本與延遲。</dd>
              <dt>serviceTier / performanceConfig</dt>
              <dd>選擇處理層級（priority、default、flex、reserved）或要求延遲最佳化，依模型與區域支援而定。</dd>
              <dt>requestMetadata</dt>
              <dd>附上最多 16 組 key-value，之後可以在 invocation log 裡篩選。</dd>
              <dt className="escape">additionalModelRequestFields</dt>
              <dd>模型特有參數的逃生口；搭配 additionalModelResponseFieldPaths 取回模型特有的回應欄位。</dd>
            </dl>
          </div>
        </div>
        <p className="muted">
          <code>modelId</code> 除了基礎模型 ID，也可以是跨區域 inference profile（如 <code>us.</code> 開頭）、Provisioned Throughput、自訂模型、Prompt Management 的 prompt 版本 ARN，或 prompt router。
        </p>
      </Section>

      <Section title="程式長什麼樣子">
        <Examples />
      </Section>

      <Section title="解析回應：Converse 只要記一種寫法">
        <Table
          head={["呼叫方式", "取出文字", "用量欄位"]}
          rows={[
            [
              "Converse（任何模型）",
              <code>resp["output"]["message"]["content"][0]["text"]</code>,
              <code>usage.inputTokens / outputTokens</code>,
            ],
            [
              "InvokeModel · Claude",
              <code>body["content"][0]["text"]</code>,
              <code>usage.input_tokens / output_tokens</code>,
            ],
            ["InvokeModel · Llama 3", <code>body["generation"]</code>, <code>prompt_token_count / generation_token_count</code>],
          ]}
        />
      </Section>

      <Section title="Converse 與 InvokeModel 怎麼選">
        <Table
          head={["", "InvokeModel", "Converse"]}
          highlight={2}
          rows={[
            ["請求格式", "各模型供應商的原生 body", "統一的 messages / system / inferenceConfig"],
            ["換模型", "要改請求組裝與回應解析", <>多數情況只改 <code>modelId</code></>],
            ["Tool use", "各家格式不同", "統一的 toolConfig / toolUse / toolResult"],
            ["模型特有參數", "直接寫在 body", <>放進 <code>additionalModelRequestFields</code></>],
            ["新功能支援", "模型新功能通常最先在這裡可用", "部分模型專屬功能可能較晚或不支援"],
            ["適用模型", "所有模型，含 embedding、圖片生成", "支援對話（messages）的模型"],
            ["適合情境", "深度綁定單一模型、要用最新專屬功能", "多模型比較與切換、自建 LLM 抽象層、新專案預設"],
          ]}
        />
      </Section>

      <Section title="使用前要知道的限制">
        <ul className="points">
          <li>
            <strong>「統一格式」不等於「所有功能都統一支援」。</strong>工具、圖片、文件、串流中的 tool use、system prompt 等，各模型支援程度不同，上線前要查官方的 supported models and features 表。
          </li>
          <li>
            <strong>用到 additionalModelRequestFields 就失去可攜性。</strong>那段參數是特定模型的格式，換模型時要一併處理。
          </li>
          <li>
            <strong>對話狀態由你管理。</strong>Converse 是無狀態 API，每次都要帶完整的 messages；Bedrock 不會儲存你送入的文字、圖片或文件。
          </li>
          <li>
            <strong>權限用的是 bedrock:InvokeModel。</strong>要封鎖某個模型的推論，要同時 deny <code>bedrock:InvokeModel</code> 與 <code>bedrock:InvokeModelWithResponseStream</code>。
          </li>
        </ul>
        <Note>
          只用 Claude、又需要 Claude 最新功能時，可以評估改用 InvokeModel，或 Bedrock 上的 Anthropic 原生 Messages API（Anthropic SDK 提供對應的 Bedrock client）；部分功能不會出現在 Converse。
        </Note>
      </Section>

      <Section title="官方文件">
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html">Use the Converse API（使用指南與支援模型表）</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html">Converse API Reference</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">各模型的 InvokeModel 參數</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
