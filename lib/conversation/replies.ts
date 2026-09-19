import type { EngineReply, WhatsAppInteractiveMessage, WhatsAppListRow } from "@/types/whatsapp";

export function textReply(text: string): EngineReply {
  return { kind: "text", text };
}

export function listReply(
  body: string,
  rows: WhatsAppListRow[],
  button = "See options",
): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body,
    list: {
      button,
      sections: [{ rows: rows.slice(0, 10) }],
    },
  };
  return { kind: "interactive", message };
}

export function confirmReply(body: string): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body,
    buttons: [
      { id: "yes", title: "YES" },
      { id: "change", title: "CHANGE" },
    ],
  };
  return { kind: "interactive", message };
}

export function skipReply(body: string): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body,
    buttons: [{ id: "skip", title: "SKIP" }],
  };
  return { kind: "interactive", message };
}

export function yesNoReply(body: string): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body,
    buttons: [
      { id: "yes", title: "YES" },
      { id: "change", title: "NO" },
    ],
  };
  return { kind: "interactive", message };
}

export function orderButtonsReply(
  body: string,
  orderId: string,
  actions: Array<"accept" | "decline" | "ready" | "complete">,
): EngineReply {
  const titles: Record<(typeof actions)[number], string> = {
    accept: "ACCEPT",
    decline: "DECLINE",
    ready: "READY",
    complete: "COMPLETE",
  };

  const message: WhatsAppInteractiveMessage = {
    body,
    buttons: actions.slice(0, 3).map((action) => ({
      id: `${action}:${orderId}`,
      title: titles[action],
    })),
  };
  return { kind: "interactive", message };
}
