export class WhatsAppError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "WhatsAppError";
    this.code = code;
    this.status = status;
  }
}

export function isWhatsAppError(error: unknown): error is WhatsAppError {
  return error instanceof WhatsAppError;
}
