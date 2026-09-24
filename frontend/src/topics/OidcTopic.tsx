import { CodeBlock } from "../components/CodeBlock";
import { External, PeerLink, Section, Table } from "../components/ui";
import { OidcLab } from "../labs/OidcLab";
import { PEER_SITES } from "../sites";

const TRUST_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:frobel0520/aws-lab:ref:refs/heads/main"
        }
      }
    }
  ]
}`;

const WORKFLOW = `name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write   # 向 GitHub 要 OIDC token
  contents: read    # checkout 需要

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Build
        working-directory: frontend
        run: npm ci && npm run build

      # 版本以 action 的 README 為準；正式環境建議 pin 到 commit SHA
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/aws-lab-deploy
          role-session-name: aws-lab-deploy
          aws-region: us-east-1

      - run: aws s3 sync frontend/dist/ s3://aws-lab-site/ --delete`;

const DEPLOY_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::aws-lab-site"
    },
    {
      "Sid": "WriteObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::aws-lab-site/*"
    },
    {
      "Sid": "Invalidate",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    }
  ]
}`;

export function OidcTopic() {
  return (
    <>
      <p className="lede">
        CI 部署到 AWS 需要憑證。把 access key 存進 GitHub Secrets 能用，但那是一把長期有效的鑰匙。用 <strong>OIDC</strong>，每次 workflow 執行都換一組短期憑證，repo 裡不存任何 AWS 金鑰。
      </p>

      <Section title="換憑證的流程">
        <ol className="steps">
          <li>workflow 向 GitHub 要一張 OIDC token（JWT），裡面記錄了 repo、分支、觸發事件等資訊。</li>
          <li>
            <code>configure-aws-credentials</code> 拿這張 token 呼叫 STS 的 <code>AssumeRoleWithWebIdentity</code>。
          </li>
          <li>
            AWS 用 IAM 裡設定的 OIDC provider 驗證 token 的簽章，再用角色的 trust policy 比對 <code>aud</code> 與 <code>sub</code>。
          </li>
          <li>通過後拿到暫時憑證，之後的 aws CLI 指令都用這組憑證，工作結束就失效。</li>
        </ol>
      </Section>

      <Section title="設定三件事">
        <h3>1. 在 IAM 新增 OIDC provider</h3>
        <p>
          Provider URL 填 <code>https://token.actions.githubusercontent.com</code>，Audience 填 <code>sts.amazonaws.com</code>（官方 configure-aws-credentials action 使用的值）。每個 AWS 帳號設定一次即可。
        </p>
        <h3>2. 建立部署角色，trust policy 限定哪些 workflow 能用</h3>
        <CodeBlock code={TRUST_POLICY} label="role trust policy" />
        <h3>3. workflow 開 id-token 權限並 assume 角色</h3>
        <CodeBlock code={WORKFLOW} label=".github/workflows/deploy.yml" />
      </Section>

      <Section title="sub 的格式">
        <p>trust policy 靠 <code>sub</code> 判斷是哪個 repo、哪種觸發。GitHub 依情況發出不同格式：</p>
        <Table
          head={["情況", "sub"]}
          rows={[
            ["push 到分支", <code>repo:OWNER/REPO:ref:refs/heads/BRANCH</code>],
            ["push tag", <code>repo:OWNER/REPO:ref:refs/tags/TAG</code>],
            ["pull request", <code>repo:OWNER/REPO:pull_request</code>],
            ["job 使用 environment", <code>repo:OWNER/REPO:environment:NAME</code>],
          ]}
        />
        <p>
          最容易踩到的是最後一種：job 一旦指定 <code>environment</code>，<code>sub</code> 就改成 environment 格式，原本寫「只允許 main 分支」的條件會對不上。
        </p>
      </Section>

      <OidcLab />

      <Section title="部署角色只給部署需要的權限">
        <p>
          上一個主題的 <code>s3 sync</code> 加 invalidation，只需要這些權限。<code>s3:ListBucket</code> 掛在 bucket 本身，物件的讀寫掛在 <code>bucket/*</code>：
        </p>
        <CodeBlock code={DEPLOY_POLICY} label="部署角色的 identity-based policy" />
      </Section>

      <Section title="延伸學習">
        <PeerLink href={PEER_SITES.softwareEngineering.url} site={PEER_SITES.softwareEngineering.title}>
          CI/CD 與部署單元：workflow 觸發、ordered gates、required check 與 rollback
        </PeerLink>
        <ul className="refs">
          <li>
            <External href="https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws">
              Configuring OpenID Connect in Amazon Web Services
            </External>
          </li>
          <li>
            <External href="https://docs.github.com/en/actions/reference/security/oidc">OpenID Connect reference（sub claim 格式）</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
