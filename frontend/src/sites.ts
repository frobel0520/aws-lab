// 學習總入口與其他平行學習站。總入口可用 VITE_HUB_URL 覆蓋。

export const HUB_URL: string = import.meta.env.VITE_HUB_URL ?? "https://frobel0520.github.io/";

export const PEER_SITES = {
  softwareEngineering: {
    title: "Software Engineering Workshop",
    url: "https://frobel0520.github.io/software-engineering-workshop/",
  },
  guardrail: {
    title: "Guardrail Workshop",
    url: "https://frobel0520.github.io/guardrail-workshop/",
  },
  agent: {
    title: "AI Agent Tutorial",
    url: "https://frobel0520.github.io/AI-Agent-Tutorial/",
  },
} as const;
