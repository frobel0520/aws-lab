// GitHub Actions OIDC token 的 sub claim 與 IAM trust policy 比對。
// sub 格式依 GitHub 文件；trust policy 的 sub 條件用 StringLike（區分大小寫，支援 * 與 ?）。

import { wildcardMatch } from "./iam";

export type TriggerKind = "branch" | "tag" | "pull_request" | "environment";

export interface WorkflowContext {
  repo: string;
  kind: TriggerKind;
  /** 分支名、tag 名或 environment 名；pull_request 不需要。 */
  name: string;
}

export const OIDC_PROVIDER_HOST = "token.actions.githubusercontent.com";
export const STS_AUDIENCE = "sts.amazonaws.com";

export function subjectClaim(context: WorkflowContext): string {
  const prefix = `repo:${context.repo}`;
  switch (context.kind) {
    case "branch":
      return `${prefix}:ref:refs/heads/${context.name}`;
    case "tag":
      return `${prefix}:ref:refs/tags/${context.name}`;
    case "pull_request":
      return `${prefix}:pull_request`;
    case "environment":
      return `${prefix}:environment:${context.name}`;
  }
}

export interface TrustCheck {
  allowed: boolean;
  sub: string;
  matchedPattern?: string;
}

export function checkTrust(context: WorkflowContext, patterns: string[]): TrustCheck {
  const sub = subjectClaim(context);
  const matchedPattern = patterns.map((pattern) => pattern.trim()).find((pattern) => pattern && wildcardMatch(pattern, sub));
  return { allowed: matchedPattern !== undefined, sub, matchedPattern };
}

export type PatternLevel = "danger" | "warn";

export function patternWarnings(pattern: string): { level: PatternLevel; message: string }[] {
  const value = pattern.trim();
  if (!value) return [];
  if (value === "*" || value.startsWith("repo:*")) {
    return [{ level: "danger", message: "任何 GitHub repo 的 workflow 都能 assume 這個角色。" }];
  }
  if (!value.startsWith("repo:")) {
    return [{ level: "warn", message: "sub 一定以 repo: 開頭，這個條件不會比對到任何 token。" }];
  }
  const [, repo = "", ...rest] = value.split(":");
  const scope = rest.join(":");
  if (repo.endsWith("/*")) {
    return [{ level: "warn", message: "同一個帳號或組織底下的所有 repo 都能 assume。" }];
  }
  if (scope === "*") {
    return [{ level: "warn", message: "這個 repo 的任何分支、tag、PR 都能 assume，包含還沒審查的程式碼。" }];
  }
  return [];
}

export function trustPolicy(accountId: string, patterns: string[]): object {
  const subs = patterns.map((pattern) => pattern.trim()).filter(Boolean);
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Federated: `arn:aws:iam::${accountId || "123456789012"}:oidc-provider/${OIDC_PROVIDER_HOST}` },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: { [`${OIDC_PROVIDER_HOST}:aud`]: STS_AUDIENCE },
          StringLike: { [`${OIDC_PROVIDER_HOST}:sub`]: subs.length === 1 ? subs[0] : subs },
        },
      },
    ],
  };
}
