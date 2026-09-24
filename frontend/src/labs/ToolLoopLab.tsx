import { useState } from "react";
import { JsonBlock } from "../components/CodeBlock";
import { Lab } from "../components/ui";
import { buildToolLoopFrames, type Actor, type ConverseMessage } from "../lib/toolLoop";

const FRAMES = buildToolLoopFrames();

const ACTOR_LABEL: Record<Actor, string> = {
  app: "你的程式",
  model: "模型（經由 Converse）",
  tool: "你的工具",
};

function blockKinds(message: ConverseMessage): string {
  return message.content.map((block) => Object.keys(block)[0]).join(" + ");
}

export function ToolLoopLab() {
  const [index, setIndex] = useState(0);
  const frame = FRAMES[index];
  const isLast = index === FRAMES.length - 1;

  return (
    <Lab title="Tool use 的一次完整來回">
      <p className="lab-intro">情境：使用者問某個料號的庫存，模型需要呼叫你寫的 <code>get_stock</code> 工具。一步一步看 messages 怎麼長出來。</p>

      <ol className="stepper">
        {FRAMES.map((step, stepIndex) => (
          <li key={step.id}>
            <button
              type="button"
              aria-current={stepIndex === index ? "step" : undefined}
              className={stepIndex < index ? "done" : undefined}
              onClick={() => setIndex(stepIndex)}
            >
              <span className="step-no">{stepIndex + 1}</span>
              <span className="step-title">{step.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="frame">
        <div className="frame-meta" aria-live="polite">
          <span className={`actor actor-${frame.actor}`}>{ACTOR_LABEL[frame.actor]}</span>
          {frame.stopReason ? <span className="pill">stopReason: {frame.stopReason}</span> : null}
          <strong className="frame-title">
            {index + 1}. {frame.title}
          </strong>
        </div>
        <p>{frame.explanation}</p>
        <JsonBlock label={frame.payloadLabel} value={frame.payload} />
        <div className="history">
          <span className="history-label">你手上的 messages（{frame.messages.length} 則）</span>
          <ol>
            {frame.messages.map((message, messageIndex) => (
              <li key={messageIndex} className={`msg msg-${message.role}`}>
                <span className="msg-role">{message.role}</span>
                <code>{blockKinds(message)}</code>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="lab-actions">
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          上一步
        </button>
        <button type="button" className="primary" onClick={() => setIndex(index + 1)} disabled={isLast}>
          下一步
        </button>
        <button type="button" onClick={() => setIndex(0)} disabled={index === 0}>
          從頭開始
        </button>
      </div>
    </Lab>
  );
}
