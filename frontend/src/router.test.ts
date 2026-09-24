import { describe, expect, it } from "vitest";
import { READY_TOPICS, TOPIC_IDS, TRACKS } from "./curriculum";
import { parseHash, topicHref } from "./router";
import { TOPIC_CONTENT } from "./topics";

describe("parseHash", () => {
  it("已知主題導到主題頁", () => {
    expect(parseHash("#/converse", TOPIC_IDS)).toEqual({ kind: "topic", topicId: "converse" });
    expect(parseHash("#/pricing/", TOPIC_IDS)).toEqual({ kind: "topic", topicId: "pricing" });
  });

  it("空白、未知或規劃中的主題回課程地圖", () => {
    for (const hash of ["", "#", "#/", "#/nope", "#/deploy"]) {
      expect(parseHash(hash, TOPIC_IDS)).toEqual({ kind: "map" });
    }
  });

  it("topicHref 與 parseHash 互通", () => {
    for (const topic of READY_TOPICS) {
      expect(parseHash(topicHref(topic.id), TOPIC_IDS)).toEqual({ kind: "topic", topicId: topic.id });
    }
  });
});

describe("curriculum", () => {
  it("主題 id 不重複", () => {
    const ids = TRACKS.flatMap((track) => track.topics.map((topic) => topic.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每個已開放主題都有對應內容", () => {
    for (const topic of READY_TOPICS) expect(TOPIC_CONTENT[topic.id]).toBeTypeOf("function");
  });
});
