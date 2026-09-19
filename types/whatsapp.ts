export type WhatsAppInboundMessage = {
  externalMessageId: string;
  waId: string;
  phoneNumber: string;
  timestamp: string | null;
  type: string;
  text: string | null;
  choiceId: string | null;
  supported: boolean;
  mediaId: string | null;
  contactName: string | null;
};

export type WhatsAppInteractiveButton = {
  id: string;
  title: string;
};

export type WhatsAppListRow = {
  id: string;
  title: string;
  description?: string;
};

export type WhatsAppListSection = {
  title?: string;
  rows: WhatsAppListRow[];
};

export type WhatsAppInteractiveMessage = {
  body: string;
  header?: string;
  footer?: string;
  buttons?: WhatsAppInteractiveButton[];
  list?: {
    button: string;
    sections: WhatsAppListSection[];
  };
};

export type WhatsAppTemplateMessage = {
  name: string;
  languageCode: string;
  components?: unknown[];
};

export type WhatsAppSendResult = {
  id: string;
};

export type WhatsAppMediaDownload = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type WhatsAppClient = {
  sendTextMessage(
    to: string,
    body: string,
    options?: { replyToMessageId?: string },
  ): Promise<WhatsAppSendResult>;
  sendInteractiveMessage(
    to: string,
    message: WhatsAppInteractiveMessage,
  ): Promise<WhatsAppSendResult>;
  sendTemplateMessage(
    to: string,
    template: WhatsAppTemplateMessage,
  ): Promise<WhatsAppSendResult>;
  markMessageRead(messageId: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<WhatsAppMediaDownload>;
};

export type EngineReply =
  | { kind: "text"; text: string }
  | { kind: "interactive"; message: WhatsAppInteractiveMessage };
