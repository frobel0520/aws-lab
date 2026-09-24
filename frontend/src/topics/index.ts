import type { ComponentType } from "react";
import { ArchitectureTopic } from "./ArchitectureTopic";
import { BedrockTopic } from "./BedrockTopic";
import { ConverseTopic } from "./ConverseTopic";
import { GuardrailsTopic } from "./GuardrailsTopic";
import { IamTopic } from "./IamTopic";
import { LambdaTopic } from "./LambdaTopic";
import { OidcTopic } from "./OidcTopic";
import { PositioningTopic } from "./PositioningTopic";
import { PricingTopic } from "./PricingTopic";
import { StaticSiteTopic } from "./StaticSiteTopic";
import { ToolUseTopic } from "./ToolUseTopic";

export const TOPIC_CONTENT: Record<string, ComponentType> = {
  bedrock: BedrockTopic,
  converse: ConverseTopic,
  "tool-use": ToolUseTopic,
  positioning: PositioningTopic,
  pricing: PricingTopic,
  guardrails: GuardrailsTopic,
  iam: IamTopic,
  "static-site": StaticSiteTopic,
  lambda: LambdaTopic,
  "github-oidc": OidcTopic,
  architecture: ArchitectureTopic,
};
