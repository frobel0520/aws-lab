import { External, Note, PeerLink, Section, Table } from "../components/ui";
import { GuardrailCostLab } from "../labs/GuardrailCostLab";
import { PEER_SITES } from "../sites";

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
            ["事實依據檢查", "檢查回答是否符合提供的資料，用來抓幻覺", "收費"],
            ["自動推理檢查", "用形式邏輯規則驗證回答是否符合政策", "收費（按政策數）"],
          ]}
        />
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
            <External href="https://aws.amazon.com/bedrock/pricing/">Amazon Bedrock 定價頁（Guardrails 段落）</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
