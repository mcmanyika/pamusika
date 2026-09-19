import { PRODUCT_UNITS, type ProductUnit } from "@/types/commerce";
import type { WhatsAppInboundMessage } from "@/types/whatsapp";

const GREETINGS = new Set(["hi", "hello", "hey", "start", "menu", "yo"]);

export type NormalizedInput = {
  raw: string;
  normalized: string;
  choice: number | null;
  choiceId: string | null;
  yes: boolean;
  change: boolean;
  skip: boolean;
  menu: boolean;
  help: boolean;
  greeting: boolean;
};

export function normalizeInput(message: WhatsAppInboundMessage): NormalizedInput {
  const raw = (message.text ?? message.choiceId ?? "").trim();
  const normalized = raw.toLowerCase();
  const choiceId = message.choiceId?.trim().toLowerCase() || null;
  const choice = parseMenuChoice(normalized) ?? (choiceId ? parseMenuChoice(choiceId) : null);

  return {
    raw,
    normalized,
    choice,
    choiceId,
    yes: isYes(normalized, choiceId),
    change: isChange(normalized, choiceId),
    skip: isSkip(normalized, choiceId),
    menu: isMenu(normalized, choiceId),
    help: isHelp(normalized, choiceId),
    greeting: GREETINGS.has(normalized),
  };
}

export function parseMenuChoice(value: string): number | null {
  const direct = /^(\d{1,2})$/.exec(value.trim());
  if (direct) {
    return Number(direct[1]);
  }

  const prefixed = /^(\d{1,2})\s*[\).\-:]/.exec(value.trim());
  if (prefixed) {
    return Number(prefixed[1]);
  }

  return null;
}

export function parsePositiveNumber(value: string): number | null {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parsePrice(value: string): number | null {
  return parsePositiveNumber(value.replace(/\$/g, ""));
}

export function parseUnit(value: string): ProductUnit | null {
  const normalized = value.trim().toLowerCase();
  const choice = parseMenuChoice(normalized);
  if (choice && choice >= 1 && choice <= PRODUCT_UNITS.length) {
    return PRODUCT_UNITS[choice - 1] ?? null;
  }

  const alias: Record<string, ProductUnit> = {
    kg: "kg",
    kilo: "kg",
    kilos: "kg",
    kilogram: "kg",
    kilograms: "kg",
    item: "item",
    items: "item",
    piece: "item",
    pieces: "item",
    bundle: "bundle",
    bundles: "bundle",
    bag: "bag",
    bags: "bag",
    box: "box",
    boxes: "box",
    other: "other",
  };

  return alias[normalized] ?? null;
}

export function parseLocation(value: string): { city?: string; area?: string } {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return { area: parts[0] };
  }

  return { city: parts[0], area: parts.slice(1).join(", ") };
}

function isYes(value: string, choiceId: string | null): boolean {
  return choiceId === "yes" || value === "yes" || value === "y" || value === "yeah";
}

function isChange(value: string, choiceId: string | null): boolean {
  return (
    choiceId === "change" ||
    value === "change" ||
    value === "edit" ||
    value === "restart" ||
    value === "no"
  );
}

function isSkip(value: string, choiceId: string | null): boolean {
  return (
    choiceId === "skip" ||
    value === "skip" ||
    value === "later" ||
    value === "no photo" ||
    value === "none"
  );
}

function isMenu(value: string, choiceId: string | null): boolean {
  return choiceId === "menu" || value === "menu" || value === "home" || value === "main";
}

function isHelp(value: string, choiceId: string | null): boolean {
  return choiceId === "help" || value === "help" || value === "support";
}

export type OrderAction = {
  action: "accept" | "decline" | "ready" | "complete";
  orderId?: string;
};

export function parseOrderAction(input: {
  choiceId: string | null;
  normalized: string;
}): OrderAction | null {
  const fromId = /^(accept|decline|ready|complete):([0-9a-f-]{8,})$/i.exec(
    input.choiceId ?? "",
  );
  if (fromId) {
    return {
      action: fromId[1]!.toLowerCase() as OrderAction["action"],
      orderId: fromId[2],
    };
  }

  if (input.normalized === "accept") return { action: "accept" };
  if (input.normalized === "decline") return { action: "decline" };
  if (input.normalized === "ready") return { action: "ready" };
  if (input.normalized === "complete" || input.normalized === "done") {
    return { action: "complete" };
  }

  return null;
}
