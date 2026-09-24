import { describe, expect, it } from "vitest";
import { buildDeployPlan, classifyFile, invalidationPathsFor, normalizeFiles } from "./deployPlan";

const VITE_DIST = ["index.html", "404.html", "favicon.svg", "assets/index-B0Jjxv7u.js", "assets/index-DkYftnLl.css"];

describe("classifyFile", () => {
  it("分辨 HTML、帶 hash 與其他檔案", () => {
    expect(classifyFile("index.html")).toBe("html");
    expect(classifyFile("assets/index-B0Jjxv7u.js")).toBe("hashed");
    expect(classifyFile("assets/logo.a1b2c3d4.svg")).toBe("hashed");
    expect(classifyFile("favicon.svg")).toBe("other");
    expect(classifyFile("assets/index-dev.js")).toBe("other");
  });
});

describe("normalizeFiles", () => {
  it("去掉 dist/ 與 ./ 前綴、空行與重複", () => {
    expect(normalizeFiles(["dist/index.html", "./favicon.svg", "", "index.html"])).toEqual(["index.html", "favicon.svg"]);
  });
});

describe("invalidationPathsFor", () => {
  it("只清沒帶 hash 的檔案，有 index.html 時加上 /", () => {
    const plan = buildDeployPlan({ bucket: "my-site", distributionId: "E123", keepOldAssets: true, files: VITE_DIST });
    expect(invalidationPathsFor(plan.files)).toEqual(["/", "/index.html", "/404.html", "/favicon.svg"]);
  });
});

describe("buildDeployPlan", () => {
  it("順序：hash 檔 → HTML → 其他 → invalidation", () => {
    const plan = buildDeployPlan({ bucket: "my-site", distributionId: "E123", keepOldAssets: true, files: VITE_DIST });
    expect(plan.steps.map((step) => step.title)).toEqual([
      "先傳帶 hash 的檔案（長期快取）",
      "再傳 HTML（每次重新驗證）",
      "其他檔案（短期快取）",
      "清掉 CloudFront 上沒帶 hash 的快取",
    ]);
    expect(plan.steps[0].command).toContain('--include "assets/*"');
    expect(plan.steps[0].command).toContain("immutable");
    expect(plan.steps[1].command).toContain('--cache-control "no-cache"');
    expect(plan.warnings).toEqual([]);
  });

  it("不保留舊檔時，在 invalidation 前加一步 --delete", () => {
    const plan = buildDeployPlan({ bucket: "my-site", distributionId: "E123", keepOldAssets: false, files: VITE_DIST });
    const titles = plan.steps.map((step) => step.title);
    expect(titles.indexOf("刪除這次沒有的舊檔")).toBe(titles.length - 2);
  });

  it("assets 目錄裡混了沒 hash 的檔案要提醒", () => {
    const plan = buildDeployPlan({
      bucket: "my-site",
      distributionId: "E123",
      keepOldAssets: true,
      files: [...VITE_DIST, "assets/logo.png"],
    });
    expect(plan.warnings.some((warning) => warning.startsWith("assets/logo.png"))).toBe(true);
  });

  it("檢查 bucket 名稱、distribution ID 與 index.html", () => {
    const plan = buildDeployPlan({ bucket: "My_Bucket", distributionId: "", keepOldAssets: true, files: ["app.js"] });
    expect(plan.warnings).toHaveLength(3);
  });
});
