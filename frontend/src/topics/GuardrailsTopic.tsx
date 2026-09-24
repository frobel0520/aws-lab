import { CodeBlock } from "../components/CodeBlock";
import { External, Note, PeerLink, Section, Table } from "../components/ui";
import { GuardrailCostLab } from "../labs/GuardrailCostLab";
import { PEER_SITES } from "../sites";

const GROUNDING_CALL = `resp = client.converse(
    modelId=MODEL_ID,
    messages=[{
        "role": "user",
        "content": [
            {"guardContent": {"text": {"text": source_text, "qualifiers": ["grounding_source"]}}},
            {"guardContent": {"text": {"text": question, "qualifiers": ["query"]}}},
        ],
    }],
    guardrailConfig={"guardrailIdentifier": GUARDRAIL_ID, "guardrailVersion": "1"},
)`;

export function GuardrailsTopic() {
  return (
    <>
      <p className="lede">
        Bedrock Guardrails 是 <strong>AWS 提供、由你選擇開啟</strong>的內容防護層。請求沒有帶 <code>guardrailConfig</code>，就不會檢查，也不會收費。
      </p>

      <Section title="加了 Guardrails 之後的流程">
        <div className="gflow" role="img" aria-label="輸入先經 Guardrails 檢查，通過才送給模型；模型輸出再經 Guardrails 檢查後回傳">
          <div className="gstep">你的輸入</div>
          <div className="garrow" aria-hidden="true">→</div>
          <div className="gstep gstep-guard">
            Guardrails
            <small>檢查輸入</small>
          </div>
          <div className="garrow" aria-hidden="true">→</div>
          <div className="gstep gstep-model">模型</div>
          <div className="garrow" aria-hidden="true">→</div>
          <div className="gstep gstep-guard">
            Guardrails
            <small>檢查輸出</small>
          </div>
          <div className="garrow" aria-hidden="true">→</div>
          <div className="gstep">回傳給你</div>
        </div>
        <ul className="points">
          <li>
            <strong>輸入違規：</strong>直接擋下、不呼叫模型，回傳你設定的封鎖訊息，<code>stopReason</code> 為 <code>guardrail_intervened</code>。
          </li>
          <li>
            <strong>輸出違規：</strong>模型的回答被替換成你設定的封鎖訊息，或把敏感資訊遮蔽後回傳。
          </li>
          <li>
            在 <code>guardrailConfig</code> 開啟 <code>trace</code> 後，回應會記錄是哪條政策攔下，以及各政策用了多少計費單位。
          </li>
        </ul>
      </Section>

      <Section title="可以檢查什麼">
        <Table
          head={["政策", "用途", "計費"]}
          rows={[
            ["內容過濾", "仇恨、暴力、色情、不當言論、prompt injection 攻擊", "收費"],
            ["禁止主題", "自訂不准談的話題，例如「不回答投資建議」「不談競品」", "收費"],
            ["敏感資訊（模型偵測）", "偵測或遮蔽身分證號、信用卡號、Email 等個資", "收費"],
            ["敏感資訊（regex）", "用自訂 regex 比對", "免費"],
            ["字詞過濾", "自訂黑名單字詞", "免費"],
            ["事實依據檢查", "檢查回答是否符合提供的資料，用來抓幻覺（見下一段）", "收費"],
            ["自動推理檢查", "用形式邏輯規則驗證回答是否符合政策", "收費（按政策數）"],
          ]}
        />
      </Section>

      <Section title="事實依據檢查：抓幻覺">
        <p>
          正式名稱是 contextual grounding check。你提供一份<strong>參考資料</strong>和<strong>使用者的問題</strong>，它檢查模型的回答有沒有忠於資料、有沒有回答到問題。適合摘要、改寫，以及根據文件回答問題（RAG）；官方文件註明不支援聊天機器人式的多輪對話。
        </p>
        <Table
          head={["檢查", "看什麼", "分數低代表"]}
          rows={[
            ["Grounding（有依據）", "回答是否都能在參考資料裡找到；回答中新冒出來的資訊一律算沒有依據", "模型自己編了內容"],
            ["Relevance（有切題）", "回答是否針對使用者的問題", "內容沒錯，但答非所問"],
          ]}
        />
        <p>以官方文件的例子來看：參考資料是「倫敦是英國首都，東京是日本首都」，問題是「日本首都是哪裡？」</p>
        <Table
          head={["模型回答", "有依據", "有切題"]}
          rows={[
            ["日本首都是東京", "是", "是"],
            ["日本首都是倫敦", "否：跟資料不符", "是"],
            ["英國首都是倫敦", "是", "否：沒回答問題"],
            ["外面在下雨", "否", "否"],
          ]}
        />
        <p>
          每次回應都會得到兩個信心分數。兩項檢查各設一個門檻（0 到 0.99），<strong>分數低於門檻就擋下</strong>。門檻越高越嚴格：幻覺比較不會漏掉，但正常回答被誤擋的機會也會變多。
        </p>
        <p>
          在 Converse 裡，用 <code>guardContent</code> 區塊的 <code>qualifiers</code> 標出哪段是參考資料、哪段是問題：
        </p>
        <CodeBlock code={GROUNDING_CALL} label="Python · boto3" />
        <ul className="points">
          <li>
            <strong>只檢查輸出。</strong>它要拿模型的回答來比，所以不會作用在 prompt 上。
          </li>
          <li>
            <strong>有長度上限。</strong>參考資料最多 100,000 字元、問題 1,000 字元、回答 5,000 字元。
          </li>
          <li>
            <strong>標記的內容會被其他政策跳過。</strong>標成 <code>grounding_source</code> 或 <code>query</code> 的內容，不會再被內容過濾、個資偵測等政策檢查；也要檢查的話，在 qualifiers 加上 <code>guard_content</code>。
          </li>
          <li>
            <strong>串流時可能晚一步。</strong>相關性是逐段檢查的，只要有一段相關，整個回答就算相關；不相關的內容可能已經串流給使用者，整段送完才被判定。
          </li>
        </ul>
        <Note tone="warn">
          它比對的是<strong>你給的資料</strong>，不是真實世界。參考資料本身有錯時，照著錯的資料回答照樣會通過；它能確保「回答忠於資料」，不能保證「回答是對的」。
        </Note>
      </Section>

      <Section title="為什麼要使用者付費">
        <p>Guardrails 是用獨立的一套檢查機制另外跑運算，而且保護的是<strong>你的應用</strong>，不是 AWS。AWS 與模型廠商自己的防護是免費且一定會套用的：</p>
        <Table
          head={["", "AWS / 模型本身的防護", "Guardrails"]}
          highlight={2}
          rows={[
            ["目的", "防止平台被濫用（違反使用政策）", "符合你公司自己的規範"],
            ["規則由誰定", "AWS、模型廠商", "你自己設定"],
            ["是否開啟", "一定有，無法關閉", "選擇性，預設不開"],
            ["費用", "免費", "依用量計費"],
          ]}
        />
        <p>
          類比：AWS 對所有人免費提供基本的 DDoS 防護（Shield Standard），但替自己的網站設定防火牆規則（WAF）要另外付費。Guardrails 屬於後者。另外，不管換哪個模型，Guardrails 套用的都是同一套規則。
        </p>
      </Section>

      <GuardrailCostLab />

      <Section title="要不要用">
        <ul className="points">
          <li>
            <strong>內部工具</strong>（例如 IT 自己用的摘要、分類）：通常不需要，模型內建的安全機制就夠。
          </li>
          <li>
            <strong>對外服務，或會處理個資、有合規要求</strong>（例如客服機器人）：比較值得考慮。
          </li>
          <li>
            <strong>自己做也可以：</strong>regex 遮蔽個資、在 system prompt 寫限制、自己寫程式檢查輸出。免費，但規則要自己維護、效果要自己驗證。
          </li>
        </ul>
        <Note>
          Guardrails 也能單獨使用：<code>ApplyGuardrail</code> API 可以檢查任何文字，包括非 Bedrock 模型產生的內容。這也說明它是一個獨立的服務。
        </Note>
      </Section>

      <Section title="延伸學習">
        <PeerLink href={PEER_SITES.guardrail.url} site={PEER_SITES.guardrail.title}>
          Guardrail 的通用概念：input / output / tool 三個掛載點、exception / fix / reask，以及可以直接玩的實驗場
        </PeerLink>
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-converse-api.html">Use a guardrail with the Converse API</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html">
              Use contextual grounding check to filter hallucinations in responses
            </External>
          </li>
          <li>
            <External href="https://aws.amazon.com/bedrock/pricing/">Amazon Bedrock 定價頁（Guardrails 段落）</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
