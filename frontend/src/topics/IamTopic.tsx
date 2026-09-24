import { CodeBlock } from "../components/CodeBlock";
import { External, Note, Section, Table } from "../components/ui";
import { PolicyLab } from "../labs/PolicyLab";

const MIN_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeClaudeSonnet",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
    }
  ]
}`;

// AWS 文件範例：只能透過 US 的 Claude 3 Haiku inference profile（us-west-2）呼叫該模型。
const PROFILE_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel*"],
      "Resource": [
        "arn:aws:bedrock:us-west-2:111122223333:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel*"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:us-west-2:111122223333:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
        }
      }
    }
  ]
}`;

export function IamTopic() {
  return (
    <>
      <p className="lede">
        IAM 決定<strong>誰</strong>可以對<strong>哪個資源</strong>做<strong>什麼動作</strong>。在 AWS 上每一個 API 呼叫——包括 Converse——都要先通過這一關。
      </p>

      <Section title="四個名詞">
        <Table
          head={["名詞", "意思", "例子"]}
          rows={[
            ["Principal", "發出請求的身分", "IAM user、IAM role，或 AWS 服務（例如 cloudfront.amazonaws.com）"],
            ["Action", "要做的動作：服務前綴 + 操作名稱", <code>bedrock:InvokeModel</code>],
            ["Resource", "動作的對象，用 ARN 表示", <code>arn:aws:s3:::company-docs/handbook.pdf</code>],
            ["Policy", "把上面組成 Allow / Deny 規則的 JSON 文件", "下面的最小權限政策"],
          ]}
        />
      </Section>

      <Section title="一份政策長什麼樣子">
        <p>這份政策讓角色只能用 Converse / ConverseStream 呼叫一個指定的模型：</p>
        <CodeBlock code={MIN_POLICY} label="identity-based policy" />
        <ul className="points">
          <li>Action 的服務前綴與動作名稱不分大小寫；Action 與 Resource 都可以用 <code>*</code>（任意長度）和 <code>?</code>（單一字元）萬用字元。</li>
          <li>
            Converse 對應 <code>bedrock:InvokeModel</code>，ConverseStream 對應 <code>bedrock:InvokeModelWithResponseStream</code>。
          </li>
          <li>
            foundation model 的 ARN 沒有帳號 ID：<code>arn:aws:bedrock:us-east-1::foundation-model/…</code>，兩個冒號中間是空的。
          </li>
        </ul>
      </Section>

      <Section title="政策掛在哪裡">
        <Table
          head={["", "身分型政策", "資源型政策"]}
          rows={[
            ["掛在", "user、role 上", "資源上：S3 bucket policy、Lambda 資源政策、角色的 trust policy"],
            ["Principal 欄位", "不寫（就是掛的那個身分）", "要寫：允許誰來存取這個資源"],
            ["例子", "Lambda 執行角色可以呼叫哪些模型", "CloudFront 可以讀這個 bucket"],
          ]}
        />
        <p>在同一個帳號裡，兩種政策的權限是聯集：任一邊允許就可以；但任一邊有明確 Deny，就會推翻所有 Allow。</p>
      </Section>

      <Section title="AWS 怎麼判斷允不允許">
        <ol className="steps">
          <li>
            <strong>預設拒絕。</strong>沒有任何政策提到這個請求，就是拒絕。
          </li>
          <li>
            <strong>有明確 Deny，就拒絕。</strong>不管其他政策有多少 Allow。
          </li>
          <li>
            <strong>有 Allow，才允許。</strong>
          </li>
        </ol>
        <Note>
          使用 AWS Organizations 時，SCP / RCP 也要允許；有設定 permissions boundary 或 session policy 時，也要同時允許。這些都只能縮小權限，不能擴大。
        </Note>
      </Section>

      <PolicyLab />

      <Section title="用 inference profile 時要多給一層">
        <p>
          modelId 用跨區域 inference profile（例如 <code>us.</code> 開頭）時，除了 inference profile 本身的 ARN，還要允許它會路由到的<strong>每個區域</strong>的 foundation model ARN。下面是 AWS 文件裡的範例：
        </p>
        <CodeBlock code={PROFILE_POLICY} label="AWS 文件範例" />
        <p className="muted">
          第二段的 <code>bedrock:InferenceProfileArn</code> 條件，讓這個角色只能透過指定的 inference profile 呼叫模型，不能直接指定區域呼叫。
        </p>
      </Section>

      <Section title="user 還是 role">
        <Table
          head={["", "IAM user + access key", "IAM role"]}
          highlight={2}
          rows={[
            ["憑證", "長期有效，外洩前都能用", "暫時憑證，時間到自動失效"],
            ["適合", "盡量避免", "程式跑在 AWS 上（Lambda 執行角色）、CI/CD（OIDC）、跨帳號存取"],
          ]}
        />
        <p>
          人要登入 AWS，建議用 IAM Identity Center，並可以串接公司既有的身分提供者（例如 Microsoft Entra ID）做 SSO；程式與 CI/CD 則用 role。GitHub Actions 怎麼拿 role 的暫時憑證，見 <a href="#/github-oidc">GitHub Actions 用 OIDC 部署</a>。
        </p>
      </Section>

      <Section title="官方文件">
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html">Policy evaluation logic</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html">Prerequisites for inference profiles</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
