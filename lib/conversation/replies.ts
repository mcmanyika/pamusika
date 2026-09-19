import type { EngineReply, WhatsAppInteractiveMessage, WhatsAppListRow } from "@/types/whatsapp";

export const REQUIRED_INTERACTIVE_BODY = "Choose an option.";

export function requiredInteractiveBody(body: string): string {
  return body.trim() || REQUIRED_INTERACTIVE_BODY;
}

export function textReply(text: string): EngineReply {
  return { kind: "text", text };
}

export function buttonReply(
  body: string,
  buttons: Array<{ id: string; title: string }>,
  extras: { header?: string; footer?: string } = {},
): EngineReply {
  const message: WhatsAppInteractiveMessage = {
    body: requiredInteractiveBody(body),
    header: extras.header,
    footer: extras.footer,
    buttons: buttons.slice(0, 3),
  };
  return { kind: "interactive", message };
}

export function menuButtonReplies(
  items: Array<{ id: string; title: string }>,
  extras: { header?: string; body?: string; footer?: string } = {},
): EngineReply[] {
  const buttons = items.slice(0, 10);
  if (buttons.length === 0) {
    return [];
  }

  const replies: EngineReply[] = [];
  for (let index = 0; index < buttons.length; index += 3) {
    const first = index === 0;
    replies.push(
      buttonReply(
        first ? (extras.body ?? REQUIRED_INTERACTIVE_BODY) : "More options.",
        buttons.slice(index, index + 3),
        {
          header: first ? extras.header : undefined,
          footer: first ? extras.footer : undefined,
        },
      ),
    );
  }
  return replies;
}

export function interactiveFallbackText(message: WhatsAppInteractiveMessage): string {
  const labels = [
    ...(message.buttons ?? []).map((button) => button.title),
    ...(message.list?.sections.flatMap((section) => section.rows.map((row) => row.title)) ?? []),
  ];
  const body = message.body.trim();
  if (labels.length === 0) {
    return body || REQUIRED_INTERACTIVE_BODY;
  }
  const options = labels.map((title, index) => `${index + 1} — ${title}`).join("\n");
  return body ? `${body}\n\n${options}` : options;
}

export function listReply(
  body: string,
  rows: WhatsAppListRow[],
  button = "Open menu",
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
