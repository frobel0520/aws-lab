export interface Topic {
  id: string;
  title: string;
  summary: string;
  /** 有互動實驗時的簡短名稱。 */
  lab?: string;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  status: "ready" | "planned";
  topics: Topic[];
}

export const TRACKS: readonly Track[] = [
  {
    id: "bedrock",
    title: "Amazon Bedrock",
    description: "從平台是什麼、怎麼呼叫模型，到費用與防護，一次走完在 AWS 上使用生成式 AI 的基本面。",
    status: "ready",
    topics: [
      {
        id: "bedrock",
        title: "Bedrock 是什麼",
        summary: "AWS 的全託管生成式 AI 平台：多家模型、呼叫 API、應用工具，以及企業為什麼選它。",
      },
      {
        id: "converse",
        title: "Converse API",
        summary: "一套請求格式呼叫所有支援對話的模型；換模型通常只要換 modelId。",
        lab: "格式對照",
      },
      {
        id: "tool-use",
        title: "Tool use 迴圈",
        summary: "模型不會自己執行工具：toolUse、toolResult 與 stopReason 的來回流程。",
        lab: "逐步走一遍",
      },
      {
        id: "positioning",
        title: "它是什麼、不是什麼",
        summary: "Converse 不是 API gateway，也不是 Cursor；它能拿來做什麼、不包含什麼。",
      },
      {
        id: "pricing",
        title: "Token 計費",
        summary: "依模型、輸入輸出、服務層級與快取計價；用 usage 欄位算出每次呼叫的費用。",
        lab: "費用試算",
      },
      {
        id: "guardrails",
        title: "Bedrock Guardrails",
        summary: "AWS 提供、由你選擇開啟的內容防護層：能檢查什麼、怎麼計費、什麼時候值得用。",
        lab: "檢查費用",
      },
    ],
  },
  {
    id: "deploy",
    title: "部署與權限",
    description: "IAM、S3 + CloudFront、Lambda 等，把應用放上 AWS 需要的基本功。",
    status: "planned",
    topics: [],
  },
];

export const READY_TOPICS: readonly (Topic & { trackId: string; trackTitle: string })[] = TRACKS.filter(
  (track) => track.status === "ready",
).flatMap((track) => track.topics.map((topic) => ({ ...topic, trackId: track.id, trackTitle: track.title })));

export const TOPIC_IDS: ReadonlySet<string> = new Set(READY_TOPICS.map((topic) => topic.id));

export function topicIndex(topicId: string): number {
  return READY_TOPICS.findIndex((topic) => topic.id === topicId);
}
