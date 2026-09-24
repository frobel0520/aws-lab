import { describe, expect, it } from "vitest";
import { checkTrust, patternWarnings, subjectClaim, trustPolicy } from "./oidc";

const repo = "frobel0520/aws-lab";
const mainOnly = [`repo:${repo}:ref:refs/heads/main`];

describe("subjectClaim", () => {
  it("依觸發方式產生 GitHub 文件中的格式", () => {
    expect(subjectClaim({ repo, kind: "branch", name: "main" })).toBe(`repo:${repo}:ref:refs/heads/main`);
    expect(subjectClaim({ repo, kind: "tag", name: "v1.0.0" })).toBe(`repo:${repo}:ref:refs/tags/v1.0.0`);
    expect(subjectClaim({ repo, kind: "pull_request", name: "" })).toBe(`repo:${repo}:pull_request`);
    expect(subjectClaim({ repo, kind: "environment", name: "production" })).toBe(`repo:${repo}:environment:production`);
  });
});

describe("checkTrust", () => {
  it("只允許 main 時，其他分支與 PR 被拒", () => {
    expect(checkTrust({ repo, kind: "branch", name: "main" }, mainOnly).allowed).toBe(true);
    expect(checkTrust({ repo, kind: "branch", name: "feature/x" }, mainOnly).allowed).toBe(false);
    expect(checkTrust({ repo, kind: "pull_request", name: "" }, mainOnly).allowed).toBe(false);
  });

  it("job 用了 environment 後 sub 變成 environment 格式，分支條件就不再成立", () => {
    expect(checkTrust({ repo, kind: "environment", name: "production" }, mainOnly).allowed).toBe(false);
    const withEnv = [...mainOnly, `repo:${repo}:environment:production`];
    const result = checkTrust({ repo, kind: "environment", name: "production" }, withEnv);
    expect(result.allowed).toBe(true);
    expect(result.matchedPattern).toBe(withEnv[1]);
  });

  it("萬用字元與大小寫", () => {
    expect(checkTrust({ repo, kind: "tag", name: "v2.3.0" }, [`repo:${repo}:ref:refs/tags/v*`]).allowed).toBe(true);
    expect(checkTrust({ repo, kind: "branch", name: "main" }, [`repo:${repo}:ref:refs/heads/MAIN`]).allowed).toBe(false);
  });
});

describe("patternWarnings", () => {
  it("抓出過寬或寫錯的條件", () => {
    expect(patternWarnings("*")[0].level).toBe("danger");
    expect(patternWarnings("repo:frobel0520/*")[0].level).toBe("warn");
    expect(patternWarnings(`repo:${repo}:*`)[0].level).toBe("warn");
    expect(patternWarnings("frobel0520/aws-lab:ref:refs/heads/main")[0].level).toBe("warn");
    expect(patternWarnings(mainOnly[0])).toEqual([]);
  });
});

describe("trustPolicy", () => {
  it("含 aud 與 sub 條件，單一 sub 時是字串", () => {
    const policy = trustPolicy("111122223333", mainOnly) as {
      Statement: { Principal: { Federated: string }; Condition: { StringEquals: object; StringLike: object } }[];
    };
    const statement = policy.Statement[0];
    expect(statement.Principal.Federated).toBe(
      "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com",
    );
    expect(statement.Condition.StringEquals).toEqual({ "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" });
    expect(statement.Condition.StringLike).toEqual({ "token.actions.githubusercontent.com:sub": mainOnly[0] });
  });
});
