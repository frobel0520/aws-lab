// 簡化版 IAM 權限評估：只處理單一帳號內的身分型政策（Effect / Action / Resource）。
// 規則依 AWS 文件：預設拒絕；任何明確 Deny 優先；否則有 Allow 才允許。
// Action 不分大小寫，Action 與 Resource 都支援 * 與 ? 萬用字元。

export type Effect = "Allow" | "Deny";

export interface Statement {
  Sid?: string;
  Effect: Effect;
  Action: string | string[];
  Resource: string | string[];
}

export interface PolicyDocument {
  Version?: string;
  Statement: Statement | Statement[];
}

export interface NamedPolicy {
  id: string;
  name: string;
  document: PolicyDocument;
}

export interface AccessRequest {
  action: string;
  resource: string;
}

export type Decision = "allow" | "explicit-deny" | "implicit-deny";

export interface StatementMatch {
  policyId: string;
  policyName: string;
  sid?: string;
  effect: Effect;
}

export interface Evaluation {
  decision: Decision;
  allows: StatementMatch[];
  denies: StatementMatch[];
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function wildcardMatch(pattern: string, value: string, caseInsensitive = false): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, caseInsensitive ? "i" : "").test(value);
}

export function statementApplies(statement: Statement, request: AccessRequest): boolean {
  const actionMatches = toArray(statement.Action).some((pattern) => wildcardMatch(pattern, request.action, true));
  const resourceMatches = toArray(statement.Resource).some((pattern) => wildcardMatch(pattern, request.resource));
  return actionMatches && resourceMatches;
}

export function evaluate(policies: NamedPolicy[], request: AccessRequest): Evaluation {
  const allows: StatementMatch[] = [];
  const denies: StatementMatch[] = [];
  for (const policy of policies) {
    for (const statement of toArray(policy.document.Statement)) {
      if (!statementApplies(statement, request)) continue;
      const match = { policyId: policy.id, policyName: policy.name, sid: statement.Sid, effect: statement.Effect };
      (statement.Effect === "Deny" ? denies : allows).push(match);
    }
  }
  const decision: Decision = denies.length > 0 ? "explicit-deny" : allows.length > 0 ? "allow" : "implicit-deny";
  return { decision, allows, denies };
}

export type ParseResult = { ok: true; document: PolicyDocument } | { ok: false; error: string };

const UNSUPPORTED_KEYS = ["NotAction", "NotResource", "Condition", "Principal", "NotPrincipal"];

function isStringOrStringArray(value: unknown): value is string | string[] {
  if (typeof value === "string") return value.length > 0;
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);
}

export function parsePolicy(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "不是合法的 JSON。" };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "政策要是一個 JSON 物件。" };
  }
  const statementValue = (raw as Record<string, unknown>).Statement;
  if (statementValue === undefined) return { ok: false, error: "缺少 Statement。" };
  const statements = toArray(statementValue as unknown);
  if (statements.length === 0) return { ok: false, error: "Statement 不能是空陣列。" };

  for (const [index, statement] of statements.entries()) {
    const label = `Statement[${index}]`;
    if (typeof statement !== "object" || statement === null || Array.isArray(statement)) {
      return { ok: false, error: `${label} 要是物件。` };
    }
    const record = statement as Record<string, unknown>;
    const unsupported = UNSUPPORTED_KEYS.find((key) => key in record);
    if (unsupported) return { ok: false, error: `${label} 用了 ${unsupported}，這個模擬器只處理 Effect、Action、Resource。` };
    if (record.Effect !== "Allow" && record.Effect !== "Deny") {
      return { ok: false, error: `${label} 的 Effect 要是 "Allow" 或 "Deny"。` };
    }
    if (!isStringOrStringArray(record.Action)) return { ok: false, error: `${label} 缺少 Action（字串或字串陣列）。` };
    if (!isStringOrStringArray(record.Resource)) return { ok: false, error: `${label} 缺少 Resource（字串或字串陣列）。` };
  }
  return { ok: true, document: raw as PolicyDocument };
}

// ---------- 實驗情境：一個呼叫 Bedrock 的 Lambda 的執行角色 ----------

export const CLAUDE_ARN =
  "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0";
export const NOVA_ARN = "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0";

export const SCENARIO_REQUESTS: readonly (AccessRequest & { id: string; label: string })[] = [
  { id: "converse", label: "Converse 呼叫 Claude Sonnet 4.5", action: "bedrock:InvokeModel", resource: CLAUDE_ARN },
  {
    id: "converse-stream",
    label: "ConverseStream 呼叫 Claude Sonnet 4.5",
    action: "bedrock:InvokeModelWithResponseStream",
    resource: CLAUDE_ARN,
  },
  { id: "nova", label: "Converse 呼叫 Nova Pro", action: "bedrock:InvokeModel", resource: NOVA_ARN },
  { id: "read-doc", label: "讀取 S3 上的文件", action: "s3:GetObject", resource: "arn:aws:s3:::company-docs/handbook.pdf" },
  { id: "delete-doc", label: "刪除 S3 上的文件", action: "s3:DeleteObject", resource: "arn:aws:s3:::company-docs/handbook.pdf" },
  {
    id: "write-log",
    label: "寫入 CloudWatch 日誌",
    action: "logs:PutLogEvents",
    resource: "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/chat-api:log-stream:2026/09/24/abc",
  },
];

export const PRESET_POLICIES: readonly NamedPolicy[] = [
  {
    id: "basic-exec",
    name: "Lambda 基本執行權限",
    document: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          Resource: "*",
        },
      ],
    },
  },
  {
    id: "bedrock-min",
    name: "Bedrock 最小權限（只允許一個模型）",
    document: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "InvokeClaudeSonnet",
          Effect: "Allow",
          Action: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
          Resource: CLAUDE_ARN,
        },
      ],
    },
  },
  {
    id: "s3-read",
    name: "S3 唯讀（company-docs）",
    document: {
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "arn:aws:s3:::company-docs/*" }],
    },
  },
  {
    id: "deny-delete",
    name: "禁止刪除任何 S3 物件",
    document: {
      Version: "2012-10-17",
      Statement: [{ Sid: "NoDelete", Effect: "Deny", Action: "s3:Delete*", Resource: "*" }],
    },
  },
  {
    id: "bedrock-all",
    name: "過寬的權限（反例）",
    document: {
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: "bedrock:*", Resource: "*" }],
    },
  },
];
