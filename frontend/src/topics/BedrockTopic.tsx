import { CodeBlock } from "../components/CodeBlock";
import { Section, Table } from "../components/ui";

const TREE = `Amazon Bedrock（平台）
 ├─ 模型：Claude、Nova、Llama、Mistral、DeepSeek、OpenAI GPT…
 ├─ 呼叫模型的 API：InvokeModel、Converse、串流、批次推論
 └─ 應用工具：Knowledge Bases、Agents / AgentCore、Guardrails、Prompt Management`;

export function BedrockTopic() {
  return (
    <>
      <p className="lede">
        Amazon Bedrock 是 AWS 的<strong>全託管生成式 AI 平台</strong>：在同一個 AWS 帳號裡，用 API 呼叫多家廠商的模型，並提供組 AI 應用的周邊工具。
      </p>
      <p>
        它不自己生產模型（AWS 自家的 Nova 系列除外），而是把各家模型集中起來。GPU 由 AWS 管理，你不用開機器、不用部署模型，費用依用量併入 AWS 帳單。
      </p>

      <Section title="平台長什麼樣子">
        <CodeBlock label="Bedrock 的組成" code={TREE} />
        <p>後面幾個主題會依序拆開：先看呼叫模型的 API（Converse），再看它的費用與 Guardrails 防護。</p>
      </Section>

      <Section title="裡面有什麼">
        <Table
          head={["類別", "內容"]}
          rows={[
            ["模型", "Anthropic Claude、Amazon Nova、Meta Llama、Mistral、DeepSeek、OpenAI 等，也有圖片生成與 embedding 模型"],
            [
              "呼叫模型的 API",
              <>
                <code>InvokeModel</code>、<code>Converse</code>、串流、批次推論、跨區域 inference profile
              </>,
            ],
            ["應用建構工具", "Knowledge Bases（RAG 知識庫）、Agents / AgentCore（AI agent）、Guardrails（內容防護）、Prompt Management"],
            ["模型客製", "微調（fine-tuning）、匯入自己的模型、模型評測"],
            ["計費方式", "依 token 用量計費；另有 Provisioned Throughput（包量保留容量）與批次推論"],
          ]}
        />
      </Section>

      <Section title="企業為什麼選它，而不直接用各家模型的 API">
        <ul className="points">
          <li>
            <strong>資料留在 AWS 裡。</strong>你的輸入與輸出不會拿去訓練模型，也不會分享給模型廠商。
          </li>
          <li>
            <strong>權限與稽核沿用 AWS。</strong>IAM 權限控管、VPC 私有連線、CloudTrail 稽核記錄都能直接用。
          </li>
          <li>
            <strong>採購簡單。</strong>費用直接進 AWS 帳單，不用另外跟各家模型廠商簽約。
          </li>
          <li>
            <strong>多模型集中。</strong>同一個平台上比較、切換不同廠商的模型。
          </li>
        </ul>
      </Section>

      <Section title="同類服務">
        <p>三大雲各有一個定位相近的平台：AWS 的 Amazon Bedrock、Microsoft 的 Azure AI Foundry、Google 的 Vertex AI。概念大多可以互相對照，差別在支援的模型、工具與計價細節。</p>
      </Section>
    </>
  );
}
