import { useState } from "react";
import { JsonBlock } from "../components/CodeBlock";
import { Lab } from "../components/ui";
import {
  MODELS,
  buildConverseRequest,
  buildInvokeModelBody,
  getModel,
  nativeWarnings,
  type ModelFamily,
} from "../lib/converse";

function toNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function FormatLab() {
  const [family, setFamily] = useState<ModelFamily>("claude");
  const [system, setSystem] = useState("你是精簡的技術助理，用繁體中文回答。");
  const [user, setUser] = useState("用三句話解釋 SSD 的 TBW");
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.3);

  const input = { system, user, maxTokens, temperature };
  const model = getModel(family);
  const warnings = nativeWarnings(family, input);

  return (
    <Lab title="同一段對話，兩種呼叫方式">
      <p className="lab-intro">
        改改看輸入，再切換模型。左邊 Converse 那一欄只有 <code>modelId</code> 會變；右邊 InvokeModel 的原生 body，每個模型都長得不一樣。
      </p>

      <div className="form-grid">
        <label className="field field-wide">
          <span>System prompt</span>
          <textarea id="format-system" rows={2} value={system} onChange={(event) => setSystem(event.target.value)} />
        </label>
        <label className="field field-wide">
          <span>使用者訊息</span>
          <textarea id="format-user" rows={2} value={user} onChange={(event) => setUser(event.target.value)} />
        </label>
        <label className="field">
          <span>maxTokens</span>
          <input
            id="format-max-tokens"
            type="number"
            min={1}
            step={1}
            value={maxTokens}
            onChange={(event) => setMaxTokens(toNumber(event.target.valueAsNumber))}
          />
        </label>
        <label className="field">
          <span>temperature</span>
          <input
            id="format-temperature"
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(event) => setTemperature(toNumber(event.target.valueAsNumber))}
          />
        </label>
      </div>

      <fieldset className="segmented">
        <legend>模型</legend>
        {MODELS.map((candidate) => (
          <label key={candidate.family} className={candidate.family === family ? "on" : undefined}>
            <input
              type="radio"
              name="format-model"
              id={`format-model-${candidate.family}`}
              value={candidate.family}
              checked={candidate.family === family}
              onChange={() => setFamily(candidate.family)}
            />
            <span className="seg-vendor">{candidate.vendor}</span>
            <span>{candidate.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="compare">
        <div className="compare-col">
          <h4>Converse</h4>
          <JsonBlock label="client.converse(...) 參數" value={buildConverseRequest(family, input)} />
        </div>
        <div className="compare-col">
          <h4>InvokeModel</h4>
          <JsonBlock label={`${model.label} 原生 body`} value={buildInvokeModelBody(family, input)} />
        </div>
      </div>

      <p className="lab-note">{model.nativeNote}</p>
      {warnings.map((warning) => (
        <p key={warning} className="lab-warn" role="status">
          {warning}
        </p>
      ))}
      <p className="lab-foot">model ID 僅供示意，實際可用的 ID 依區域與帳號開通狀態而定。</p>
    </Lab>
  );
}
