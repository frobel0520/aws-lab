import { Note, PeerLink, Section, Table } from "../components/ui";
import { PEER_SITES } from "../sites";

export function ArchitectureTopic() {
  return (
    <>
      <p className="lede">
        把前面的主題組起來：一個前端靜態網站，加上一個呼叫 Bedrock 的 API，用 GitHub Actions 自動部署。<strong>每一段都用角色與最小權限串起來，沒有任何長期金鑰。</strong>
      </p>

      <Section title="兩條路徑">
        <div className="arch" role="img" aria-label="使用者請求經 CloudFront 分流到 S3 與 Lambda，Lambda 呼叫 Bedrock；部署由 GitHub Actions 經 OIDC 取得部署角色後更新 S3、CloudFront 與 Lambda">
          <div className="arch-lane">
            <span className="arch-label">使用者請求</span>
            <div className="arch-row">
              <div className="gstep">使用者</div>
              <div className="garrow" aria-hidden="true">
                →
              </div>
              <div className="gstep gstep-model">CloudFront</div>
              <div className="arch-fork">
                <div className="arch-branch">
                  <span className="garrow">/* →</span>
                  <div className="gstep">
                    S3
                    <small>前端靜態檔</small>
                  </div>
                </div>
                <div className="arch-branch">
                  <span className="garrow">/api/* →</span>
                  <div className="gstep">
                    Lambda
                    <small>執行角色</small>
                  </div>
                  <span className="garrow">→</span>
                  <div className="gstep gstep-guard">
                    Bedrock
                    <small>Converse + Guardrails</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="arch-lane">
            <span className="arch-label">部署</span>
            <div className="arch-row">
              <div className="gstep">GitHub Actions</div>
              <span className="garrow">→ OIDC →</span>
              <div className="gstep">
                部署角色
                <small>暫時憑證</small>
              </div>
              <span className="garrow">→</span>
              <div className="gstep">
                s3 sync、invalidation
                <small>更新 Lambda 程式</small>
              </div>
            </div>
          </div>
        </div>
        <p>
          前端與 API 放在同一個 CloudFront distribution 下，瀏覽器看到的是同一個網域，不需要處理 CORS。CloudFront 也能用 OAC 保護 Lambda function URL（auth type 要設 AWS_IAM），讓函式只接受經過 CloudFront 的請求。
        </p>
        <Note tone="warn">
          用 OAC 保護 function URL 時，POST / PUT 請求要由前端自己算出 request body 的 SHA-256，放在 <code>x-amz-content-sha256</code> header 裡送出；Lambda 不接受沒有簽 payload 的請求。
        </Note>
      </Section>

      <Section title="誰拿什麼權限">
        <Table
          head={["身分", "用在哪", "權限", "信任誰"]}
          rows={[
            [
              "部署角色",
              "GitHub Actions",
              "s3:ListBucket、PutObject、DeleteObject；cloudfront:CreateInvalidation；lambda:UpdateFunctionCode",
              <>
                GitHub OIDC，<code>sub</code> 限定 repo 的 main 分支
              </>,
            ],
            ["Lambda 執行角色", "Lambda 函式", "指定模型的 bedrock:InvokeModel*；寫 CloudWatch Logs", <code>lambda.amazonaws.com</code>],
            ["CloudFront（服務主體）", "讀 S3、呼叫 function URL", "bucket policy 的 s3:GetObject；函式資源政策的 Invoke 權限", "以 AWS:SourceArn 限定這個 distribution"],
          ]}
        />
        <p>每一列都只給自己需要的動作與資源：部署角色碰不到 Bedrock，Lambda 動不了 S3 上的網站檔案。</p>
      </Section>

      <Section title="上線前檢查">
        <div className="groups">
          <div className="group">
            <h3>安全</h3>
            <ul className="points">
              <li>repo 與 CI 裡沒有任何長期 access key</li>
              <li>每個角色都是最小權限，沒有 bedrock:* 或管理員權限</li>
              <li>API 有驗證或只能經 CloudFront 存取</li>
              <li>S3 bucket 封鎖公開存取</li>
            </ul>
          </div>
          <div className="group">
            <h3>成本</h3>
            <ul className="points">
              <li>AWS Budgets 預算警示</li>
              <li>輸入長度檢查與 maxTokens 上限</li>
              <li>Lambda reserved concurrency</li>
              <li>
                只在需要時開 Guardrails，並理解它的計費（見 <a href="#/guardrails">Bedrock Guardrails</a>）
              </li>
            </ul>
          </div>
          <div className="group">
            <h3>可觀測</h3>
            <ul className="points">
              <li>Lambda 日誌進 CloudWatch Logs</li>
              <li>
                回應的 <code>usage</code> 寫進日誌，才算得出每次呼叫的費用
              </li>
              <li>
                Converse 的 <code>requestMetadata</code> 標記來源，方便在 invocation log 篩選
              </li>
            </ul>
          </div>
          <div className="group">
            <h3>交付</h3>
            <ul className="points">
              <li>部署角色的 trust policy 只允許 main 分支（或指定 environment）</li>
              <li>HTML 與 hash 檔的快取設定分開</li>
              <li>部署後只 invalidate 沒帶 hash 的檔案</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="延伸學習">
        <div className="peer-list">
          <PeerLink href={PEER_SITES.softwareEngineering.url} site={PEER_SITES.softwareEngineering.title}>
            日誌、CI/CD 與部署單元：把上線檢查變成每次都會跑的流程
          </PeerLink>
          <PeerLink href={PEER_SITES.guardrail.url} site={PEER_SITES.guardrail.title}>
            縱深防禦：輸入、輸出、工具呼叫三個掛載點的防護設計
          </PeerLink>
        </div>
      </Section>
    </>
  );
}
