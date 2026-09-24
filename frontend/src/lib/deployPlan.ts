// 把 Vite 的 dist/ 部署到 S3 + CloudFront 的指令規劃。
// 帶 hash 的檔案長期快取、HTML 每次重新驗證、其餘短期快取；先傳 assets 再傳 HTML，最後才清舊檔與 invalidate。

export type FileKind = "hashed" | "html" | "other";

export const CACHE_CONTROL: Record<FileKind, string> = {
  hashed: "public, max-age=31536000, immutable",
  html: "no-cache",
  other: "public, max-age=3600",
};

const HASHED = /[-.][A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|ico|json|wasm)$/;

export function classifyFile(path: string): FileKind {
  if (/\.html?$/i.test(path)) return "html";
  if (HASHED.test(path)) return "hashed";
  return "other";
}

export interface DeployInput {
  bucket: string;
  distributionId: string;
  keepOldAssets: boolean;
  files: string[];
}

export interface PlannedFile {
  path: string;
  kind: FileKind;
  cacheControl: string;
}

export interface DeployStep {
  title: string;
  command: string;
}

export interface DeployPlan {
  files: PlannedFile[];
  steps: DeployStep[];
  invalidationPaths: string[];
  warnings: string[];
}

export function normalizeFiles(lines: string[]): string[] {
  const seen = new Set<string>();
  for (const line of lines) {
    const path = line.trim().replace(/^\.?\/+/, "").replace(/^dist\//, "");
    if (path) seen.add(path);
  }
  return [...seen];
}

/** 帶 hash 的檔案所在的目錄（`assets/*`），放在根目錄的就用完整路徑。 */
function hashedPatterns(files: PlannedFile[]): string[] {
  const patterns = new Set<string>();
  for (const file of files) {
    if (file.kind !== "hashed") continue;
    const slash = file.path.lastIndexOf("/");
    patterns.add(slash === -1 ? file.path : `${file.path.slice(0, slash)}/*`);
  }
  return [...patterns].sort();
}

function patternCovers(pattern: string, path: string): boolean {
  return pattern.endsWith("/*") ? path.startsWith(pattern.slice(0, -1)) : pattern === path;
}

export function invalidationPathsFor(files: PlannedFile[]): string[] {
  const paths = files.filter((file) => file.kind !== "hashed").map((file) => `/${file.path}`);
  // 預設根物件是 index.html 時，「/」在 CloudFront 快取裡是另一個 key，要一起清。
  if (files.some((file) => file.path === "index.html")) paths.unshift("/");
  return paths;
}

const BUCKET_NAME = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export function buildDeployPlan(input: DeployInput): DeployPlan {
  const files = normalizeFiles(input.files).map((path) => {
    const kind = classifyFile(path);
    return { path, kind, cacheControl: CACHE_CONTROL[kind] };
  });
  const bucket = input.bucket.trim() || "YOUR-BUCKET";
  const distributionId = input.distributionId.trim() || "YOUR-DISTRIBUTION-ID";
  const target = `s3://${bucket}/`;
  const patterns = hashedPatterns(files);
  const warnings: string[] = [];

  if (!BUCKET_NAME.test(input.bucket.trim())) {
    warnings.push("bucket 名稱要 3–63 個字元，只能用小寫英數字、點與連字號，開頭結尾要是英數字。");
  }
  if (!input.distributionId.trim()) warnings.push("還沒填 CloudFront distribution ID。");
  if (!files.some((file) => file.path === "index.html")) warnings.push("檔案清單裡沒有 index.html。");

  for (const file of files) {
    if (file.kind !== "hashed" && patterns.some((pattern) => patternCovers(pattern, file.path))) {
      warnings.push(`${file.path} 沒有 hash，卻放在長期快取的目錄裡；改版後使用者可能一直拿到舊檔。`);
    }
  }

  const steps: DeployStep[] = [];
  if (patterns.length > 0) {
    steps.push({
      title: "先傳帶 hash 的檔案（長期快取）",
      command: [
        `aws s3 sync dist/ ${target}`,
        `  --exclude "*"`,
        ...patterns.map((pattern) => `  --include "${pattern}"`),
        `  --cache-control "${CACHE_CONTROL.hashed}"`,
      ].join(" \\\n"),
    });
  }
  if (files.some((file) => file.kind === "html")) {
    steps.push({
      title: "再傳 HTML（每次重新驗證）",
      command: [`aws s3 sync dist/ ${target}`, `  --exclude "*"`, `  --include "*.html"`, `  --cache-control "${CACHE_CONTROL.html}"`].join(
        " \\\n",
      ),
    });
  }
  if (files.some((file) => file.kind === "other")) {
    steps.push({
      title: "其他檔案（短期快取）",
      command: [
        `aws s3 sync dist/ ${target}`,
        ...patterns.map((pattern) => `  --exclude "${pattern}"`),
        `  --exclude "*.html"`,
        `  --cache-control "${CACHE_CONTROL.other}"`,
      ].join(" \\\n"),
    });
  }
  if (!input.keepOldAssets) {
    steps.push({ title: "刪除這次沒有的舊檔", command: `aws s3 sync dist/ ${target} --delete` });
  }

  const invalidationPaths = invalidationPathsFor(files);
  if (invalidationPaths.length > 0) {
    steps.push({
      title: "清掉 CloudFront 上沒帶 hash 的快取",
      command: [
        `aws cloudfront create-invalidation`,
        `  --distribution-id ${distributionId}`,
        `  --paths ${invalidationPaths.map((path) => `"${path}"`).join(" ")}`,
      ].join(" \\\n"),
    });
  }

  return { files, steps, invalidationPaths, warnings };
}
