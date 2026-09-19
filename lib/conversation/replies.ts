import type { EngineReply, WhatsAppInteractiveMessage, WhatsAppListRow } from "@/types/whatsapp";

export function textReply(text: string): EngineReply {
  return { kind: "text", text };
}

export function buttonReply(
  body: string,
  buttons: Array<{ id: string; title: string }>,
): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body,
    buttons: buttons.slice(0, 3),
  };
  return { kind: "interactive", message };
}

export function listReply(
  body: string,
  rows: WhatsAppListRow[],
  button = "See options",
): EngineReply {
  const visible = rows
    .slice(0, 10)
    .map((row, index) => `${index + 1} — ${row.title}`)
    .join("\n");
  const message: WhatsAppInteractiveMessage = {
    body: `${body}\n\n${visible}`,
    list: {
      button,
      sections: [{ title: "Menu", rows: rows.slice(0, 10) }],
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
