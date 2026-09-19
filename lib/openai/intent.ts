import { zodTextFormat } from "openai/helpers/zod";
import { createOpenAIClient } from "@/lib/openai/client";
import {
  interpretedIntentSchema,
  type InterpretedIntent,
} from "@/lib/openai/schemas";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/utils/logger";

const MAX_MESSAGE_CHARS = 1000;

const INSTRUCTIONS = `You extract a commerce intent from a WhatsApp message for PaySell, a marketplace for informal vendors in Zimbabwe.

Rules:
- Fill the structured object only. Do not execute anything.
- If a field is not clearly present in the message, use null. Never guess names, prices, quantities, units, or locations.
- Never invent IDs, totals, inventory, payments, or order status changes.
- quantity and price must be numbers or null.
- Listing stock (example: "I have 20kg tomatoes at $1") is ADD_PRODUCT.
- Looking for goods (example: "I want tomatoes in Mbare") is SEARCH_PRODUCT.
- Asking to buy without naming a specific listing is SEARCH_PRODUCT or CREATE_ORDER.
- Unclear messages are UNKNOWN with low confidence.`;

export type IntentInterpreterInput = {
  text: string;
  userType: string;
  state: string;
};

export type IntentInterpreter = {
  interpret(input: IntentInterpreterInput): Promise<InterpretedIntent | null>;
};

export type StructuredParseClient = {
  responses: {
    parse(body: {
      model: string;
      instructions?: string;
      input: string;
      text: { format: unknown };
    }): Promise<{ output_parsed: unknown }>;
  };
};

export function createOpenAIIntentInterpreter(
  client: StructuredParseClient | null = createOpenAIClient() as StructuredParseClient | null,
): IntentInterpreter {
  return {
    async interpret(input) {
      if (!client) {
        return null;
      }

      const text = input.text.trim().slice(0, MAX_MESSAGE_CHARS);
      if (text.length === 0) {
        return null;
      }

      try {
        const env = getEnv();
        const response = await client.responses.parse({
          model: env.openaiModel,
          instructions: INSTRUCTIONS,
          input: `userType=${input.userType}\nstate=${input.state}\nmessage=${text}`,
          text: {
            format: zodTextFormat(interpretedIntentSchema, "interpreted_intent"),
          },
        });

        const parsed = interpretedIntentSchema.safeParse(response.output_parsed);
        if (!parsed.success) {
          logger.warn({
            operation: "openai_intent",
            result: "invalid_output",
          });
          return null;
        }

        if (!Number.isFinite(parsed.data.confidence) || parsed.data.confidence < 0 || parsed.data.confidence > 1) {
          logger.warn({
            operation: "openai_intent",
            result: "invalid_confidence",
          });
          return null;
        }

        return sanitizeIntent(parsed.data);
      } catch (error) {
        logger.warn({
          operation: "openai_intent",
          result: "failed",
          error: error instanceof Error ? error.message : "unknown",
        });
        return null;
      }
    },
  };
}

function sanitizeIntent(intent: InterpretedIntent): InterpretedIntent {
  return {
    intent: intent.intent,
    confidence: intent.confidence,
    entities: {
      product_name: cleanText(intent.entities.product_name),
      quantity: cleanPositive(intent.entities.quantity),
      unit: cleanText(intent.entities.unit),
      price: cleanPositive(intent.entities.price),
      currency: cleanText(intent.entities.currency),
      location: cleanText(intent.entities.location),
      search_query: cleanText(intent.entities.search_query),
      first_name: cleanText(intent.entities.first_name),
      business_name: cleanText(intent.entities.business_name),
    },
  };
}

function cleanText(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanPositive(value: number | null): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}
