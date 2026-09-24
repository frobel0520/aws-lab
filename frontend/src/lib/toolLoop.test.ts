import { describe, expect, it } from "vitest";
import { buildToolLoopFrames, type ConverseMessage } from "./toolLoop";

const frames = buildToolLoopFrames();
const byId = (id: string) => {
  const frame = frames.find((candidate) => candidate.id === id);
  if (!frame) throw new Error(`missing frame ${id}`);
  return frame;
};

describe("buildToolLoopFrames", () => {
  it("五個步驟、id 不重複、結果固定", () => {
    expect(frames).toHaveLength(5);
    expect(new Set(frames.map((frame) => frame.id)).size).toBe(5);
    expect(buildToolLoopFrames()).toEqual(frames);
  });

  it("先 tool_use，最後 end_turn", () => {
    expect(byId("tool-use").stopReason).toBe("tool_use");
    expect(frames.at(-1)?.stopReason).toBe("end_turn");
  });

  it("assistant 的 toolUse 訊息被原樣加回 messages", () => {
    const toolUsePayload = byId("tool-use").payload as { output: { message: ConverseMessage } };
    expect(byId("send-result").messages[1]).toEqual(toolUsePayload.output.message);
  });

  it("toolResult 的 toolUseId 對得上 toolUse", () => {
    const [, assistant, result] = byId("send-result").messages;
    const toolUse = assistant.content.find((block) => "toolUse" in block);
    expect(toolUse && "toolUse" in toolUse).toBe(true);
    expect(result.role).toBe("user");
    for (const block of result.content) {
      expect("toolResult" in block).toBe(true);
      if ("toolResult" in block && toolUse && "toolUse" in toolUse) {
        expect(block.toolResult.toolUseId).toBe(toolUse.toolUse.toolUseId);
      }
    }
  });

  it("messages 的 role 以 user / assistant 交替", () => {
    const roles = frames.at(-1)!.messages.map((message) => message.role);
    roles.forEach((role, index) => expect(role).toBe(index % 2 === 0 ? "user" : "assistant"));
  });
});
