// 呼叫 Bedrock 的 Lambda 設定檢查。數值限制依 AWS 文件：timeout 1–900 秒（預設 3 秒）、
// 記憶體 128–10,240 MB、API Gateway HTTP API 整合逾時上限 30 秒。

export type Entry = "function-url" | "http-api";
export type Access = "public" | "authenticated";
export type RoleScope = "minimal" | "bedrock-all" | "admin";
export type Severity = "danger" | "warn" | "ok";

export interface LambdaConfig {
  timeoutSec: number;
  memoryMb: number;
  entry: Entry;
  access: Access;
  /** null 代表沒有設定 reserved concurrency。 */
  reservedConcurrency: number | null;
  roleScope: RoleScope;
  guardrail: boolean;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export const HTTP_API_TIMEOUT_SEC = 30;

const ORDER: Record<Severity, number> = { danger: 0, warn: 1, ok: 2 };

export function reviewLambdaConfig(config: LambdaConfig): Finding[] {
  const findings: Finding[] = [];
  const add = (id: string, severity: Severity, title: string, detail: string) =>
    findings.push({ id, severity, title, detail });

  if (!(config.timeoutSec >= 1 && config.timeoutSec <= 900)) {
    add("timeout-range", "danger", "timeout 超出範圍", "Lambda 的 timeout 只能設 1–900 秒。");
  } else if (config.timeoutSec <= 3) {
    add("timeout-default", "danger", "timeout 還是預設的 3 秒", "呼叫模型、等它產生回答，幾乎一定超過 3 秒，函式會被中斷。");
  } else if (config.timeoutSec < 30) {
    add("timeout-short", "warn", "timeout 偏短", "較長的回答可能需要數十秒；依實際量測的延遲設定，並留一些餘裕。");
  } else {
    add("timeout-ok", "ok", "timeout 有預留時間", `目前設定 ${config.timeoutSec} 秒。`);
  }

  if (config.entry === "http-api" && config.timeoutSec > HTTP_API_TIMEOUT_SEC) {
    add(
      "http-api-timeout",
      "warn",
      "HTTP API 最多等 30 秒",
      "API Gateway HTTP API 的整合逾時上限是 30 秒且不能調高；Lambda 設得再長，請求也會在 30 秒被切斷。長回答考慮串流或改用 function URL。",
    );
  }

  if (!(config.memoryMb >= 128 && config.memoryMb <= 10240)) {
    add("memory-range", "danger", "記憶體超出範圍", "Lambda 記憶體只能設 128–10,240 MB。");
  }

  if (config.reservedConcurrency === 0) {
    add("concurrency-zero", "danger", "reserved concurrency 設成 0", "設成 0 會讓函式完全無法被呼叫。");
  }

  if (config.access === "public") {
    if (config.reservedConcurrency === null) {
      add(
        "public-unlimited",
        "danger",
        "公開存取而且沒有併發上限",
        "任何拿到網址的人都能一直呼叫，每一次都在花你的 Bedrock 費用。至少設定 reserved concurrency，並加上驗證。",
      );
    } else {
      add(
        "public-limited",
        "warn",
        "公開存取",
        "已經限制同時執行數，但任何人仍可呼叫。建議加上驗證（function URL 用 AWS_IAM、API Gateway 用 authorizer），或在程式裡檢查呼叫者。",
      );
    }
    if (!config.guardrail) {
      add("public-guardrail", "warn", "公開服務沒有 Guardrails", "對外開放時，考慮用 Guardrails 過濾輸入與輸出，並限制輸入長度與 maxTokens。");
    }
  } else {
    add(
      "authenticated",
      "ok",
      "需要驗證才能呼叫",
      config.entry === "function-url"
        ? "AWS_IAM 模式下，呼叫端需要 lambda:InvokeFunctionUrl 與 lambda:InvokeFunction 權限。"
        : "由 API Gateway 的 authorizer 先驗證呼叫者。",
    );
  }

  if (config.roleScope === "admin") {
    add("role-admin", "danger", "執行角色有管理員權限", "程式有漏洞時，攻擊者就能操作整個 AWS 帳號。只給需要的動作與資源。");
  } else if (config.roleScope === "bedrock-all") {
    add("role-broad", "warn", "執行角色可以呼叫所有模型", "bedrock:* on * 會允許任何模型與所有 Bedrock 操作；改成只允許用到的模型 ARN。");
  } else {
    add("role-minimal", "ok", "執行角色是最小權限", "只允許指定模型的 InvokeModel 與 InvokeModelWithResponseStream，再加上寫日誌。");
  }

  return findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export function summarize(findings: Finding[]): Record<Severity, number> {
  return findings.reduce(
    (counts, finding) => ({ ...counts, [finding.severity]: counts[finding.severity] + 1 }),
    { danger: 0, warn: 0, ok: 0 } as Record<Severity, number>,
  );
}
