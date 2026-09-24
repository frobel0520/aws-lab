import { useRef, useState } from "react";

interface CodeBlockProps {
  code: string;
  label?: string;
}

// 只標示註解：Python 的 `#` 與 JSON 範例裡的 `//`。
const COMMENT = /(^|\s)(#|\/\/)\s.*$/;

function renderLine(line: string, index: number) {
  const match = line.match(COMMENT);
  if (!match || match.index === undefined) return <span key={index}>{line}{"\n"}</span>;
  const start = match.index + match[1].length;
  return (
    <span key={index}>
      {line.slice(0, start)}
      <span className="tok-comment">{line.slice(start)}</span>
      {"\n"}
    </span>
  );
}

export function CodeBlock({ code, label }: CodeBlockProps) {
  const [copied, setCopied] = useState<"idle" | "copied" | "selected">("idle");
  const codeRef = useRef<HTMLElement>(null);

  function flash(state: "copied" | "selected") {
    setCopied(state);
    window.setTimeout(() => setCopied("idle"), 1500);
  }

  function selectText() {
    const node = codeRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    flash("selected");
  }

  function copy() {
    try {
      navigator.clipboard.writeText(code).then(() => flash("copied"), selectText);
    } catch {
      selectText();
    }
  }

  return (
    <div className="code">
      <div className="code-bar">
        <span>{label ?? ""}</span>
        <button type="button" onClick={copy}>
          {copied === "copied" ? "已複製" : copied === "selected" ? "已選取" : "複製"}
        </button>
      </div>
      <pre>
        <code ref={codeRef}>{code.split("\n").map(renderLine)}</code>
      </pre>
    </div>
  );
}

export function JsonBlock({ value, label }: { value: unknown; label?: string }) {
  return <CodeBlock code={JSON.stringify(value, null, 2)} label={label} />;
}
