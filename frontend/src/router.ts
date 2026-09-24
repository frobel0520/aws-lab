export type Route = { kind: "map" } | { kind: "topic"; topicId: string };

/** 解析 `#/converse` 這類 hash；未知或空白一律回課程地圖。 */
export function parseHash(hash: string, topicIds: ReadonlySet<string>): Route {
  const id = hash.replace(/^#\/?/, "").replace(/\/+$/, "").trim();
  return topicIds.has(id) ? { kind: "topic", topicId: id } : { kind: "map" };
}

export function topicHref(topicId: string): string {
  return `#/${topicId}`;
}
