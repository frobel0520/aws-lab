import { CodeBlock } from "../components/CodeBlock";
import { External, Note, Section, Table } from "../components/ui";
import { DeployPlanLab } from "../labs/DeployPlanLab";

const BUCKET_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aws-lab-site/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/E1A2B3C4D5E6F7"
        }
      }
    }
  ]
}`;

export function StaticSiteTopic() {
  return (
    <>
      <p className="lede">
        前端 build 出來的 <code>dist/</code> 是一包靜態檔案。在 AWS 上最常見的放法是：<strong>S3 存檔案，CloudFront 對外提供 HTTPS 與快取。</strong>
      </p>

      <Section title="架構">
        <div className="gflow" role="img" aria-label="使用者經由 CloudFront 存取，CloudFront 用 OAC 簽章讀取私有的 S3 bucket">
          <div className="gstep">使用者</div>
          <div className="garrow" aria-hidden="true">
            →
          </div>
          <div className="gstep gstep-model">
            CloudFront
            <small>HTTPS、快取、自訂網域</small>
          </div>
          <div className="garrow" aria-hidden="true">
            → OAC 簽章 →
          </div>
          <div className="gstep">
            S3 bucket
            <small>私有，封鎖公開存取</small>
          </div>
        </div>
        <p>
          bucket 保持私有，只有 CloudFront 能讀。CloudFront 用 <strong>origin access control（OAC）</strong>替每個送往 S3 的請求簽章，S3 再用 bucket policy 確認請求確實來自你的 distribution。
        </p>
      </Section>

      <Section title="為什麼不直接開 S3 的靜態網站功能">
        <Table
          head={["", "S3 website endpoint", "S3 REST endpoint + CloudFront OAC"]}
          highlight={2}
          rows={[
            ["HTTPS", "不支援", "支援（由 CloudFront 提供）"],
            ["bucket 要公開嗎", "要，內容必須公開可讀", "不用，bucket 保持私有"],
            ["能用 OAC 嗎", "不能，只能當 custom origin", "可以"],
          ]}
        />
        <p className="muted">
          AWS 也提供 Amplify Hosting，把 S3 + CloudFront 的設定包起來；想要最少設定可以用它。這裡拆開講，是為了看懂底下每一層在做什麼。
        </p>
      </Section>

      <Section title="讓 CloudFront 讀 bucket 的政策">
        <p>
          這是資源型政策，掛在 bucket 上。Principal 是 CloudFront 服務，<code>AWS:SourceArn</code> 條件限定只有你這個 distribution 可以讀：
        </p>
        <CodeBlock code={BUCKET_POLICY} label="S3 bucket policy" />
      </Section>

      <Section title="設定檢查清單">
        <ul className="points">
          <li>
            <strong>Block Public Access 保持開啟</strong>，Object Ownership 維持預設的 Bucket owner enforced。
          </li>
          <li>
            OAC 的 signing behavior 選 <strong>Sign requests（always）</strong>，CloudFront 到 S3 一律走 HTTPS。
          </li>
          <li>
            Viewer protocol policy 設 <strong>Redirect HTTP to HTTPS</strong>；default root object 設 <code>index.html</code>。
          </li>
          <li>
            用自訂網域時，給 CloudFront 用的 ACM 憑證要建在 <strong>us-east-1</strong>。
          </li>
          <li>
            路由：本站用 hash 路由（<code>#/iam</code>），不需要額外設定。用 history 路由的 SPA，要把 403 / 404 導回 <code>/index.html</code>——OAC 沒給 <code>s3:ListBucket</code> 時，找不到的檔案會回 403 而不是 404。
          </li>
        </ul>
      </Section>

      <Section title="快取策略">
        <p>CloudFront 的邊緣節點和使用者的瀏覽器都會快取。Vite 的輸出檔名帶有內容 hash，內容變了檔名就變，所以可以放心長期快取；HTML 檔名固定，必須每次重新驗證。</p>
        <Table
          head={["檔案", "例子", "Cache-Control", "原因"]}
          rows={[
            ["帶 hash", <code>assets/index-B0Jjxv7u.js</code>, <code>public, max-age=31536000, immutable</code>, "內容變了檔名就變，舊網址永遠對應舊內容"],
            ["HTML", <code>index.html</code>, <code>no-cache</code>, "檔名不變；每次都向 CloudFront 確認有沒有新版"],
            ["其他", <code>favicon.svg</code>, <code>public, max-age=3600</code>, "不常變、也沒有 hash，給短期快取"],
          ]}
        />
        <p>
          部署後 CloudFront 上仍可能留著舊的 HTML，要送 invalidation 清掉。每個帳號每月前 1,000 個 invalidation 路徑免費，<code>/*</code> 這種萬用字元路徑只算一個。帶 hash 的檔案不需要 invalidate——新檔名本來就是新網址。
        </p>
      </Section>

      <DeployPlanLab />

      <Section title="跟 GitHub Pages 比">
        <Table
          head={["", "GitHub Pages", "S3 + CloudFront"]}
          rows={[
            ["設定", "幾乎不用設定", "要設 bucket、OAC、distribution、憑證"],
            ["費用", "公開 repo 免費", "依儲存、請求與流量計費"],
            ["HTTP 標頭", "不能自訂 Cache-Control 等標頭", "每個檔案都能自訂"],
            ["存取控制", "公開網站", "可以私有，搭配 WAF、簽章網址"],
            ["跟後端整合", "後端要放在別的網域，需要 CORS", "同一個 distribution 可以把 /api/* 轉給後端"],
          ]}
        />
        <Note>
          純靜態、公開的教材站（例如本站），GitHub Pages 已經足夠。需要後端、存取控制或精細快取時，才值得換到 S3 + CloudFront。
        </Note>
      </Section>

      <Section title="官方文件">
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html">
              Restrict access to an Amazon S3 origin（OAC）
            </External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html">Pay for file invalidation</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
