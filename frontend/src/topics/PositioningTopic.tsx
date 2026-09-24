import { PeerLink, Section, Table } from "../components/ui";
import { PEER_SITES } from "../sites";

export function PositioningTopic() {
  return (
    <>
      <p className="lede">
        Converse 本身只做一件事：<strong>把訊息送給模型，拿回回應。</strong>搞清楚它不是什麼，比較容易判斷它該放在系統的哪一層。
      </p>

      <Section title="它不是 API gateway">
        <p>
          比較準確的說法是：Converse 是 Bedrock 服務裡的一個 API 操作，由 Bedrock 在伺服器端把一套統一格式轉成各模型自己的格式。它跟 gateway 有點像（一個入口通往多個後端），但少了 gateway 的核心功能。
        </p>
        <Table
          head={["", "API / LLM gateway", "Converse"]}
          rows={[
            ["後端範圍", "任意服務，或多家 LLM 供應商", "只有 Bedrock 上的模型"],
            ["選擇模型", "可依規則路由、失敗時自動換模型（fallback）", "由你在 modelId 指定；只有 prompt router 和跨區域 inference profile 做簡單路由"],
            ["存取管理", "發 key 給各團隊、設配額、限流", "沿用 AWS IAM 和 Bedrock 帳號配額"],
            ["部署", "通常自己架設或另外訂閱", "AWS 託管，直接呼叫"],
          ]}
        />
        <p>
          真的需要 LLM gateway（跨供應商、分團隊配額、自動 fallback、集中記錄用量）時，常見做法是在前面加一層 LiteLLM Proxy、Kong AI Gateway 這類工具，後端再接 Bedrock。這時 Converse 是 gateway 背後的其中一個後端。
        </p>
      </Section>

      <Section title="它也不是 AWS 版的 Cursor">
        <p>兩者在不同的層級：</p>
        <Table
          head={["層級", "誰在用", "例子"]}
          rows={[
            ["應用（有介面，給人用）", "使用者", "Cursor、Claude Code、ChatGPT；AWS 這一層有 Amazon Q Developer、Kiro"],
            [
              "API（沒有介面，給程式呼叫）",
              "開發者寫的程式",
              <>
                <strong>Converse</strong>、Anthropic Messages API、OpenAI API
              </>,
            ],
            ["模型", "—", "Claude、Nova、Llama"],
          ]}
        />
        <p>Cursor 這類產品的後端，就是在呼叫 Converse 這種 API。要在 AWS 上自己做一個類似的工具，「呼叫模型」那段可以用 Converse，編輯器、檔案讀寫、工具迴圈都要自己寫。</p>
      </Section>

      <Section title="具體可以拿來做什麼">
        <Table
          head={["你想做的事", "例子", "用到的功能"]}
          rows={[
            ["內部聊天助理", "內部系統的問答機器人、寫信與翻譯助手", "messages 多輪對話 + ConverseStream 逐字顯示"],
            ["文件擷取成結構化資料", "發票、報關單、規格書 PDF 轉成 JSON 寫進資料庫", "document 輸入 + outputConfig（JSON Schema）"],
            ["圖片理解", "產品標籤、截圖、表單照片讀出內容", "image 輸入"],
            ["讓模型查系統資料", "「料號 X 庫存多少」→ 呼叫你寫的 ERP 查詢函式", "toolConfig（tool use）"],
            ["分類 / 摘要", "IT 工單分類、會議記錄摘要、Email 分流", "基本呼叫 + cachePoint 快取重複的長 prompt"],
            ["知識庫問答（RAG）", "查內部 SOP、制度文件後回答", "先檢索（自建或 Knowledge Bases），再交給 Converse"],
            ["比較模型", "同一批題目丟給 Claude、Nova、Llama，比品質與成本", "只換 modelId"],
            ["輸入輸出過濾", "擋掉個資外洩、不當內容", "guardrailConfig"],
          ]}
        />
      </Section>

      <Section title="它不包含的東西">
        <ul className="points">
          <li>
            <strong>對話紀錄儲存：</strong>無狀態 API，歷史要自己存。
          </li>
          <li>
            <strong>向量資料庫與文件檢索：</strong>用 Bedrock Knowledge Bases 或自建。
          </li>
          <li>
            <strong>Agent 執行環境與多步驟流程編排：</strong>tool use 迴圈要自己寫，或用 Bedrock Agents / AgentCore。
          </li>
          <li>
            <strong>Embedding、圖片生成、微調：</strong>不走 Converse。
          </li>
        </ul>
        <p className="takeaway">一句話：Converse 是「呼叫模型」這一步的標準做法，其餘的應用邏輯要自己組。</p>
      </Section>

      <Section title="延伸學習">
        <div className="peer-list">
          <PeerLink href={PEER_SITES.agent.url} site={PEER_SITES.agent.title}>
            RAG 與 agent 的應用邏輯怎麼組：REST API、LangChain、WebHook、Dify
          </PeerLink>
          <PeerLink href={PEER_SITES.softwareEngineering.url} site={PEER_SITES.softwareEngineering.title}>
            把呼叫模型的程式包成服務：REST API、驗證授權、日誌、部署
          </PeerLink>
        </div>
      </Section>
    </>
  );
}
