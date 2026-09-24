import { CodeBlock } from "../components/CodeBlock";
import { External, Note, Section, Table } from "../components/ui";
import { CostLab } from "../labs/CostLab";

const USAGE = `resp["usage"]
# {"inputTokens": 200, "outputTokens": 500, "totalTokens": ...,
#  "cacheReadInputTokens": 1800, "cacheWriteInputTokens": 0}

# 開啟快取時，inputTokens 只算「沒有命中快取」的部分
total_input = (resp["usage"]["inputTokens"]
               + resp["usage"].get("cacheReadInputTokens", 0)
               + resp["usage"].get("cacheWriteInputTokens", 0))`;

export function PricingTopic() {
  return (
    <>
      <p className="lede">
        Token 計費<strong>主要看用哪個模型</strong>，但呼叫方式、快取與區域也會影響價格。
      </p>

      <Section title="影響價格的因素">
        <h3>1. 模型（最主要）</h3>
        <ul className="points">
          <li>每個模型各有自己的單價，<strong>輸入與輸出 token 分開計價</strong>，輸出通常貴好幾倍。</li>
          <li>模型之間的價差很大，小模型和頂級模型可以差到上百倍。</li>
          <li>每個模型的 tokenizer 不同，同一段文字在不同模型算出的 token 數也不一樣。</li>
        </ul>

        <h3>2. 呼叫方式與服務層級</h3>
        <Table
          head={["方式", "計費"]}
          rows={[
            ["On-demand（預設）", "用多少 token 算多少"],
            ["批次推論（Batch）", "比 on-demand 便宜，但結果非即時"],
            ["Service tier（priority / flex 等）", "priority 較貴但優先處理，flex 較便宜但可能較慢"],
            ["Provisioned Throughput", "不按 token，按小時包下固定容量"],
          ]}
        />

        <h3>3. Prompt 快取</h3>
        <p>
          命中快取的 token 用較便宜的快取讀取單價計算；寫入快取依模型可能比一般輸入貴。重複使用同一段長 prompt（很長的 system prompt、同一份文件）時省最多。快取只適用 on-demand，批次推論不支援。
        </p>

        <h3>4. 區域</h3>
        <p>同一個模型在不同 AWS 區域、不同 inference profile 下，價格可能不一樣。</p>
      </Section>

      <Section title="從 usage 算費用">
        <p>每次 Converse 回應都附有用量。要注意的是，開啟快取時 <code>inputTokens</code> 不含快取讀取與寫入的部分，三者要分開乘上各自的單價。</p>
        <CodeBlock code={USAGE} label="Python" />
      </Section>

      <CostLab />

      <Section title="不影響與另外計費的部分">
        <ul className="points">
          <li>
            <strong>Converse 與 InvokeModel 價格一樣。</strong>Converse 本身不另收費。
          </li>
          <li>
            <strong>周邊功能各自計費。</strong>Guardrails、Knowledge Bases 等不包含在模型的 token 費用裡，見 <a href="#/guardrails">Bedrock Guardrails</a>。
          </li>
        </ul>
        <Note>
          本站不列模型單價，因為價格依模型、區域與層級變動。實際數字以 <External href="https://aws.amazon.com/bedrock/pricing/">Amazon Bedrock 定價頁</External> 為準。
        </Note>
      </Section>
    </>
  );
}
