import { z } from "zod";

export const INTENT_NAMES = [
  "REGISTER_VENDOR",
  "ADD_PRODUCT",
  "UPDATE_PRODUCT",
  "REMOVE_PRODUCT",
  "VIEW_PRODUCTS",
  "SEARCH_PRODUCT",
  "CREATE_ORDER",
  "VIEW_ORDER",
  "ACCEPT_ORDER",
  "DECLINE_ORDER",
  "MARK_READY",
  "COMPLETE_ORDER",
  "CANCEL_ORDER",
  "VIEW_SALES",
  "UPDATE_VENDOR_PROFILE",
  "HELP",
  "TALK_TO_HUMAN",
  "UNKNOWN",
] as const;

export type IntentName = (typeof INTENT_NAMES)[number];

export const INTENT_CONFIDENCE_THRESHOLD = 0.8;

export const intentEntitiesSchema = z.object({
  product_name: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  location: z.string().nullable(),
  search_query: z.string().nullable(),
  first_name: z.string().nullable(),
  business_name: z.string().nullable(),
});

export const interpretedIntentSchema = z.object({
  intent: z.enum(INTENT_NAMES),
  confidence: z.number(),
  entities: intentEntitiesSchema,
});

export type IntentEntities = z.infer<typeof intentEntitiesSchema>;
export type InterpretedIntent = z.infer<typeof interpretedIntentSchema>;
