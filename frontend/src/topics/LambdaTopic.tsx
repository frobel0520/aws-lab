import { CodeBlock } from "../components/CodeBlock";
import { External, Note, Section, Table } from "../components/ui";
import { LambdaReviewLab } from "../labs/LambdaReviewLab";

const HANDLER = `import base64
import json
import os

import boto3

# 在 handler 外建立 client：同一個執行環境的後續呼叫會重用
bedrock = boto3.client("bedrock-runtime")
MODEL_ID = os.environ["MODEL_ID"]


def handler(event, context):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    question = json.loads(raw).get("question", "").strip()
    if not question or len(question) > 2000:
        return {"statusCode": 400, "body": json.dumps({"error": "question 需為 1–2000 字"})}

    resp = bedrock.converse(
        modelId=MODEL_ID,
        messages=[{"role": "user", "content": [{"text": question}]}],
        inferenceConfig={"maxTokens": 1024},
    )
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(
            {"answer": resp["output"]["message"]["content"][0]["text"], "usage": resp["usage"]},
            ensure_ascii=False,
        ),
    }`;

export function LambdaTopic() {
  return (
    <>
      <p className="lede">
        靜態網站不能放 AWS 憑證——前端程式碼任何人都看得到。所以<strong>呼叫 Bedrock 的那一段要放在後端</strong>。Lambda 讓你只寫一個函式、不用管伺服器，用多少算多少。
      </p>

      <Section title="基本概念">
        <Table
          head={["名詞", "意思"]}
          rows={[
            [
              "handler",
              <>
                進入點函式，例如 <code>handler(event, context)</code>
              </>,
            ],
            ["event", "這次呼叫的輸入。經由 function URL 或 API Gateway 呼叫時，HTTP 請求會被包成 JSON"],
            ["execution role", "函式執行時的身分，決定程式能呼叫哪些 AWS API。呼叫 Bedrock 的權限給在這裡"],
            ["timeout", "預設 3 秒，最長 900 秒（15 分鐘）"],
            ["記憶體", "128–10,240 MB；CPU 依記憶體比例分配，1,769 MB 約等於 1 個 vCPU"],
            ["日誌", "print 的輸出會進 CloudWatch Logs；執行角色需要 logs 的寫入權限"],
          ]}
        />
      </Section>

      <Section title="一個呼叫 Converse 的函式">
        <CodeBlock code={HANDLER} label="Python · lambda_function.py" />
        <ul className="points">
          <li>boto3 client 建在 handler 外面，同一個執行環境的後續呼叫可以重用連線。</li>
          <li>模型 ID 放在環境變數，換模型不用改程式。</li>
          <li>先檢查輸入長度、設 maxTokens 上限：這兩個數字直接決定每次呼叫最多花多少錢。</li>
          <li>Lambda 執行環境內建的 boto3 版本可能較舊；要用較新的 Bedrock 功能，把 boto3 一起打包進部署套件或 layer，版本才在你手上。</li>
        </ul>
      </Section>

      <Section title="從網路呼叫：function URL 還是 API Gateway">
        <Table
          head={["", "Lambda function URL", "API Gateway HTTP API"]}
          rows={[
            ["設定", "在函式上開一個 HTTPS 網址", "要建 API、route 與 integration"],
            ["驗證", "AWS_IAM 或 NONE（公開）", "JWT、Lambda、IAM authorizer"],
            ["逾時", "跟著函式的 timeout", "整合逾時上限 30 秒，不能調高"],
            ["限流", "靠 reserved concurrency 限制同時執行數", "可以在 stage、route 設定限流"],
            ["自訂網域", "要在前面加 CloudFront", "內建自訂網域"],
          ]}
        />
        <p>模型產生長回答常常超過 30 秒，這是選 function URL 的常見理由；需要 JWT 驗證、限流與自訂網域時，API Gateway 比較省事。</p>
      </Section>

      <Section title="公開網址會被拿去花你的錢">
        <p>
          function URL 的 auth type 設成 <code>NONE</code>，而且資源政策允許公開存取時，<strong>任何拿到網址的人都能呼叫你的函式</strong>。對一般 API 是安全問題，對呼叫 Bedrock 的函式還是成本問題：每一次呼叫都是你付的 token。
        </p>
        <ul className="points">
          <li>
            <strong>加驗證：</strong>function URL 用 AWS_IAM，或放在 API Gateway authorizer、CloudFront 後面。
          </li>
          <li>
            <strong>限制規模：</strong>設定 reserved concurrency，限制同時執行數。
          </li>
          <li>
            <strong>限制單次成本：</strong>檢查輸入長度、設 maxTokens 上限，必要時加 Guardrails。
          </li>
          <li>
            <strong>設預算警示：</strong>用 AWS Budgets 在費用超過門檻時通知你。
          </li>
        </ul>
        <Note>
          從 2025 年 10 月起，新建立的 function URL 需要資源政策同時允許 <code>lambda:InvokeFunctionUrl</code> 與 <code>lambda:InvokeFunction</code>。用主控台或 SAM 建立公開網址時會自動加上，用 CLI 或 CloudFormation 要自己加。
        </Note>
      </Section>

      <LambdaReviewLab />

      <Section title="官方文件">
        <ul className="refs">
          <li>
            <External href="https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html">Control access to Lambda function URLs</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html">Lambda quotas</External>
          </li>
          <li>
            <External href="https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html">HTTP API quotas</External>
          </li>
        </ul>
      </Section>
    </>
  );
}
