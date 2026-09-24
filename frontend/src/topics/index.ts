import type { ComponentType } from "react";
import { BedrockTopic } from "./BedrockTopic";
import { ConverseTopic } from "./ConverseTopic";
import { GuardrailsTopic } from "./GuardrailsTopic";
import { PositioningTopic } from "./PositioningTopic";
import { PricingTopic } from "./PricingTopic";
import { ToolUseTopic } from "./ToolUseTopic";

export const TOPIC_CONTENT: Record<string, ComponentType> = {
  bedrock: BedrockTopic,
  converse: ConverseTopic,
  "tool-use": ToolUseTopic,
  positioning: PositioningTopic,
  pricing: PricingTopic,
  guardrails: GuardrailsTopic,
};
